import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  imageUrl: { type: String },
  cartItems: { type: Object, default: {} }
}, { minimize: false });

// Safety hook to catch if an object is passed as _id
userSchema.pre(['findOneAndDelete', 'findOneAndRemove', 'deleteOne'], function(next) {
  const conditions = this.getQuery();
  
  console.log('🔍 Mongoose pre-delete hook');
  console.log('Query _id:', conditions._id, '| Type:', typeof conditions._id);
  
  // If _id is an object, try to extract the actual ID
  if (conditions._id && typeof conditions._id === 'object') {
    console.log('⚠️ _id is an object! Value:', conditions._id);
    
    const actualId = conditions._id.id || conditions._id._id || conditions._id.user_id;
    
    if (actualId && typeof actualId === 'string') {
      console.log('✅ Extracted string ID:', actualId);
      this.setQuery({ ...conditions, _id: actualId });
    } else {
      console.error('❌ Cannot extract valid ID from object');
      return next(new Error('Invalid _id: expected string, received object'));
    }
  }
  
  next();
});

const User = mongoose.models.user || mongoose.model('user', userSchema);

export default User;