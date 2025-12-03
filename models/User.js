import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  imageUrl: { type: String },
  cartItems: { type: Object, default: {} }
}, { minimize: false });

// Add pre-hook to catch and fix the object being passed as _id
userSchema.pre(['findOneAndDelete', 'findOneAndRemove', 'deleteOne'], function(next) {
  const conditions = this.getQuery();
  
  console.log('🔍 Pre-delete hook triggered');
  console.log('Query conditions:', JSON.stringify(conditions, null, 2));
  
  // Check if _id is an object instead of a string
  if (conditions._id && typeof conditions._id === 'object') {
    console.log('⚠️ WARNING: _id is an object, not a string!');
    console.log('Object value:', conditions._id);
    
    // Try to extract the actual ID
    const actualId = conditions._id.id || conditions._id._id || conditions._id.user_id;
    
    if (actualId && typeof actualId === 'string') {
      console.log('✅ Extracted ID from object:', actualId);
      this.setQuery({ ...conditions, _id: actualId });
    } else {
      console.error('❌ Could not extract valid ID from object');
      return next(new Error('Invalid _id format: expected string, got object'));
    }
  } else {
    console.log('✅ _id is correctly formatted as string:', conditions._id);
  }
  
  next();
});

const User = mongoose.models.user || mongoose.model('user', userSchema);

export default User;