// inngestHandlers.js
import { Inngest } from "inngest";
import connectDb from "./db";
import User from "./models/User";

// Initialize Inngest client
export const inngest = new Inngest({ id: "quickcart-next" });

/**
 * Helper function to safely extract user data from Clerk event
 */
function parseUserData(eventData) {
  if (!eventData) return null;

  const id = eventData.id || eventData._id || eventData.user_id || eventData; // fallback
  if (!id || typeof id !== "string") return null;

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
  async (event) => {
    console.log("User creation event:", event);
    const userData = parseUserData(event.data);
    if (!userData || !userData._id) {
      console.error("Invalid creation event data:", event.data);
      return;
    }

    await connectDb();
    try {
      await User.create(userData);
      console.log("User created:", userData._id);
    } catch (err) {
      console.error("Error creating user:", err.message);
    }
  }
);

/**
 * UPDATE USER
 */
export const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async (event) => {
    console.log("User update event:", event);
    const userData = parseUserData(event.data);
    if (!userData || !userData._id) {
      console.error("Invalid update event data:", event.data);
      return;
    }

    await connectDb();
    try {
      const updatedUser = await User.findByIdAndUpdate(userData._id, userData, { new: true, upsert: false });
      if (updatedUser) {
        console.log("User updated:", userData._id);
      } else {
        console.warn("User not found for update:", userData._id);
      }
    } catch (err) {
      console.error("Error updating user:", err.message);
    }
  }
);

/**
 * DELETE USER
 */
export const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async (event) => {
    // Log EVERYTHING
    console.log("=== USER DELETION EVENT START ===");
    console.log("Full event object:", JSON.stringify(event, null, 2));
    console.log("event.data type:", typeof event.data);
    console.log("event.data is array?:", Array.isArray(event.data));
    console.log("event.data:", event.data);
    
    // Extract ID step by step with logging
    let id = null;
    
    if (event.data && typeof event.data === 'object' && !Array.isArray(event.data)) {
      console.log("event.data is an object");
      console.log("event.data.id:", event.data.id);
      console.log("event.data._id:", event.data._id);
      console.log("event.data.user_id:", event.data.user_id);
      
      id = event.data.id || event.data._id || event.data.user_id;
      console.log("Extracted id from object:", id);
    } else if (typeof event.data === 'string') {
      console.log("event.data is a string");
      id = event.data;
      console.log("Using event.data directly as id:", id);
    }
    
    // Validation with detailed logging
    console.log("Final id value:", id);
    console.log("Final id type:", typeof id);
    console.log("Is id a string?:", typeof id === 'string');
    console.log("id stringified:", JSON.stringify(id));
    
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error("❌ VALIDATION FAILED - Invalid user ID");
      console.error("Reason: id is", id === null ? "null" : id === undefined ? "undefined" : `type ${typeof id}`);
      return { success: false, error: "Invalid user ID" };
    }

    console.log("✅ Validation passed. ID to delete:", id);
    
    await connectDb();
    
    try {
      console.log("=== CALLING MONGOOSE ===");
      console.log("About to call User.findByIdAndDelete with:", id);
      console.log("Type check before Mongoose call:", typeof id);
      console.log("Value check before Mongoose call:", JSON.stringify(id));
      
      // Try to force it to be a string
      const idString = String(id);
      console.log("Converted to string:", idString);
      console.log("String type check:", typeof idString);
      
      const deletedUser = await User.findByIdAndDelete(idString);
      
      if (deletedUser) {
        console.log("✅ User deleted successfully:", idString);
        return { success: true, deletedUserId: idString };
      } else {
        console.warn("⚠️ User not found for deletion:", idString);
        return { success: false, error: "User not found" };
      }
    } catch (err) {
      console.error("❌ MONGOOSE ERROR");
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      console.error("Value that caused error:", id);
      console.error("Type that caused error:", typeof id);
      return { success: false, error: err.message };
    } finally {
      console.log("=== USER DELETION EVENT END ===");
    }
  }
);