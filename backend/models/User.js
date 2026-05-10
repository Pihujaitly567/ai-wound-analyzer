const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor'], default: 'patient' },
  profile: {
    // Patient fields
    age: { type: Number },
    bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    allergies: [{ type: String }],
    diabetesStatus: { type: String, enum: ['None', 'Type 1', 'Type 2', 'Pre-diabetic'], default: 'None' },
    
    // Doctor fields
    specialty: { type: String },
    hospital: { type: String },
    licenseNumber: { type: String },
    yearsOfExperience: { type: Number }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
