const { Inngest } = require("inngest");
const connectDb = require("./db");
const User = require("./models/User"); // Import your Mongoose User model

// Initialize Inngest client
const inngest = new Inngest({ id: "quickcart-next" });

// Helper to safely parse user data
function parseUserData(data) {
  if (!data) return null;

  const id = data.id || data._id; // handle deletion events
  const first_name = data.first_name || "";
  const last_name = data.last_name || "";
  const email_addresses = data.email_addresses || data.email_addressess; // typo safety
  const imageUrl = data.image_url || null;

  if (!id) return null;
  if (!email_addresses?.[0]?.email_address) return null;

  return {
    _id: id,
    name: `${first_name} ${last_name}`.trim(),
    email: email_addresses[0].email_address,
    imageUrl,
  };
}

// -----------------------------
// CREATE USER
// -----------------------------
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async (event) => {
    console.log("Incoming user.created event:", event);

    const userData = parseUserData(event.data);
    if (!userData) {
      console.error("Invalid event data for creation", event.data);
      return;
    }

    await connectDb();
    await User.create(userData);
    console.log("User created:", userData._id);
  }
);

// -----------------------------
// UPDATE USER
// -----------------------------
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async (event) => {
    console.log("Incoming user.updated event:", event);

    const userData = parseUserData(event.data);
    if (!userData) {
      console.error("Invalid event data for update", event.data);
      return;
    }

    await connectDb();
    await User.findByIdAndUpdate(userData._id, userData, { new: true });
    console.log("User updated:", userData._id);
  }
);

// -----------------------------
// DELETE USER
// -----------------------------
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async (event) => {
    console.log("Incoming user.deleted event:", event);

    const id = event.data?.id || event.data; // handle object or string payload
    if (!id) {
      console.error("Invalid event data for deletion", event.data);
      return;
    }

    await connectDb();
    await User.findByIdAndDelete(id);
    console.log("User deleted:", id);
  }
);

// Export handlers
module.exports = {
  inngest,
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion,
};
