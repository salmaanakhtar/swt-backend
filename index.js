const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
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

const tripSchema = new mongoose.Schema({
    tripID: { type: Number, unique: true },
    userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    destination: String,
    startDate: Date,
    endDate: Date,
    purpose: String,
    status: { type: String, enum: ['planned', 'ongoing', 'completed'] }
});



const User = mongoose.model('User', userSchema);
const Trip = mongoose.model('Trip', tripSchema);


// Signup endpoint
app.post('/signup', async (req, res) => {
    const { firstName, lastName, username, email, password } = req.body;
    try {
        // Check if a user with the same username or email already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

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

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Trip.find();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new task
app.post('/api/tasks', async (req, res) => {
    try {
        const lastTask = await Trip.findOne().sort({ tripID: -1 });
        const newTask = new Trip({
            tripID: lastTask ? lastTask.tripID + 1 : 1,
            userID: req.body.userID,
            destination: req.body.destination,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            purpose: req.body.purpose,
            status: req.body.status
        });
        const savedTask = await newTask.save();
        res.json(savedTask);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a task by ID
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const deletedTask = await Trip.findByIdAndDelete(req.params.id);
        if (deletedTask) {
            res.json({ message: 'Task deleted successfully' });
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Edit a task by ID
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const updatedTask = await Trip.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (updatedTask) {
            res.json(updatedTask);
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
