import { Inngest } from "inngest";
import connectDb from "./db";
import User from "@/models/User";

// Initialize Inngest client
export const inngest = new Inngest({ id: "quickcart-next" });

/**
 * Helper function to safely extract user data from Clerk event
 */
function parseUserData(eventData) {
  if (!eventData) {
    console.error("parseUserData: eventData is null or undefined");
    return null;
  }

  // Extract ID
  const id = eventData.id || eventData._id || eventData.user_id;
  
  if (!id || typeof id !== "string") {
    console.error("parseUserData: Could not extract valid ID", { eventData });
    return null;
  }

  const firstName = eventData.first_name || "";
  const lastName = eventData.last_name || "";
  const email = eventData.email_addresses?.[0]?.email_address || eventData.email_address || "";
  const imageUrl = eventData.image_url || "";

  return {
    _id: id,
    name: `${firstName} ${lastName}`.trim() || "Unknown",
    email,
    imageUrl,
  };
}

/**
 * CREATE USER
 */
export const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    console.log("=== USER CREATION EVENT ===");
    console.log("Event data:", JSON.stringify(event.data, null, 2));

    const userData = parseUserData(event.data);
    
    if (!userData || !userData._id) {
      console.error("❌ Invalid creation event data");
      return { success: false, error: "Invalid user data" };
    }

    await connectDb();

    try {
      const newUser = await User.create(userData);
      console.log("✅ User created successfully:", userData._id);
      return { success: true, userId: userData._id };
    } catch (err) {
      console.error("❌ Error creating user:", err.message);
      return { success: false, error: err.message };
    }
  }
);

/**
 * UPDATE USER
 */
export const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    console.log("=== USER UPDATE EVENT ===");
    console.log("Event data:", JSON.stringify(event.data, null, 2));

    const userData = parseUserData(event.data);
    
    if (!userData || !userData._id) {
      console.error("❌ Invalid update event data");
      return { success: false, error: "Invalid user data" };
    }

    await connectDb();

    try {
      const updatedUser = await User.findByIdAndUpdate(
        userData._id, 
        userData, 
        { new: true, upsert: false }
      );
      
      if (updatedUser) {
        console.log("✅ User updated successfully:", userData._id);
        return { success: true, userId: userData._id };
      } else {
        console.warn("⚠️ User not found for update:", userData._id);
        return { success: false, error: "User not found" };
      }
    } catch (err) {
      console.error("❌ Error updating user:", err.message);
      return { success: false, error: err.message };
    }
  }
);

/**
 * DELETE USER
 */
export const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    console.log("=== USER DELETION EVENT ===");
    console.log("Event data:", JSON.stringify(event.data, null, 2));
    console.log("Event data type:", typeof event.data);

    // Extract ID with comprehensive fallback logic
    let id = null;

    if (!event.data) {
      console.error("❌ event.data is null or undefined");
      return { success: false, error: "No event data" };
    }

    // Case 1: event.data is an object with id property
    if (typeof event.data === 'object' && !Array.isArray(event.data)) {
      id = event.data.id || event.data._id || event.data.user_id;
      console.log("Extracted ID from object:", id);
    } 
    // Case 2: event.data is directly a string
    else if (typeof event.data === 'string') {
      id = event.data;
      console.log("Using event.data directly as ID:", id);
    }

    // Validate the extracted ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error("❌ Could not extract valid string ID");
      console.error("event.data:", event.data);
      console.error("extracted id:", id);
      return { success: false, error: "Invalid user ID format" };
    }

    console.log("✅ Valid ID extracted:", id);

    await connectDb();

    try {
      console.log("Attempting to delete user with ID:", id);
      
      // Use deleteOne for better clarity
      const result = await User.deleteOne({ _id: id });
      
      console.log("Delete result:", result);

      if (result.deletedCount > 0) {
        console.log("✅ User deleted successfully:", id);
        return { success: true, deletedUserId: id };
      } else {
        console.warn("⚠️ User not found for deletion:", id);
        return { success: false, error: "User not found" };
      }
    } catch (err) {
      console.error("❌ Error deleting user:", err.message);
      console.error("Full error:", err);
      return { success: false, error: err.message };
    }
  }
);