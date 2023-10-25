const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const {sign} = require("jsonwebtoken");
const cors = require('cors');


const app = express();
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://salmaanakhtar:salmaanakhtar@swt.qpmzwzp.mongodb.net/swt?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define mongoose schema and model for User
const userSchema = new mongoose.Schema({
    userID: Number,
    firstName: String,
    lastName: String,
    username: String,
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model('User', userSchema);

// Signup endpoint
app.post('/signup', async (req, res) => {
    const { firstName, lastName, username, email, password } = req.body;
    try {
        // Get the current maximum userID from the database
        const lastUser = await User.findOne().sort({ userID: -1 });
        const userID = lastUser ? lastUser.userID + 1 : 1;

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user with the incremented userID
        const newUser = new User({ userID, firstName, lastName, username, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'User created successfully', userID });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Login endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            res.status(401).json({ error: 'Invalid email or password' });
        } else {
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                // Generate a JWT token for the user
                const token = sign({ email: user.email }, 'secret_key');

                res.json({ token, user });
            } else {
                res.status(401).json({ error: 'Invalid email or password' });
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
