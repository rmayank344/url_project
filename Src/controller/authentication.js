const { OAuth2Client } = require('google-auth-library');
const jwt = require('jwt-simple');
const User = require("../models/user_model"); // Import the User model

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register Route (POST /register)
exports.register_route = async (req, res, next) => {
  const { tokenId } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, sub: userId, name } = payload;


    // Check if the user already exists in the database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already registered' });
    }

    // Save the new user to the database
    const newUser = new User({
      name,
      email,
      password: userId, // You can hash this or use another unique identifier
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.encode({ userId, email }, process.env.JWT_SECRET);

    res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: 'Error registering user' });
  }
};



exports.login_route = async (req, res, next) => {
  const { tokenId } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, sub: userId } = payload;

    // Check if the user exists in the database
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: 'User not registered' });
    }

    // Generate JWT token
    const token = jwt.encode({ userId, email }, process.env.JWT_SECRET);

    res.status(200).json({ message: 'User logged in successfully', token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: 'Error logging in user' });
  }
};
