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

const User = mongoose.model('User', userSchema);

const taskSchema = new mongoose.Schema({
    taskID: { type: Number, unique: true },
    userID: Number,
    title: String,
    description: String,
    deadline: Date,
    status: String // Removed the enum constraint
});

const Task = mongoose.model('Task', taskSchema);

const subTaskSchema = new mongoose.Schema({
    subTaskID: { type: Number, unique: true },
    taskID: Number,
    title: String,
    description: String,
    deadline: Date,
    status: String
});

const SubTask = mongoose.model('SubTask', subTaskSchema);


// Signup endpoint
app.post('/signup', async (req, res) => {A
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

        return res.status(201).json({ message: 'User created successfully', userID });

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

// Create Task endpoint
app.post('/tasks', async (req, res) => {
    const { userID, title, description, deadline, status } = req.body;
    try {
        // Get the current maximum taskID from the database
        const lastTask = await Task.findOne().sort({ taskID: -1 });
        const taskID = lastTask ? lastTask.taskID + 1 : 1;

        // Create a new task with the incremented taskID and user ID
        const newTask = new Task({ taskID, userID, title, description, deadline, status });
        await newTask.save();

        return res.status(201).json({ message: 'Task created successfully', taskID });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get tasks by userID endpoint
app.get('/tasks/:userID', async (req, res) => {
    const { userID } = req.params;
    try {
        // Find tasks based on the provided userID
        const tasks = await Task.find({ userID: parseInt(userID) });

        return res.status(200).json(tasks);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Edit Task endpoint
app.put('/tasks/:taskID', async (req, res) => {
    const { taskID } = req.params;
    const { title, description, deadline, status } = req.body;
    try {
        // Find the task by taskID and update its properties
        const updatedTask = await Task.findOneAndUpdate(
            { taskID: parseInt(taskID) },
            { title, description, deadline, status },
            { new: true } // Return the updated task
        );

        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        return res.status(200).json({ message: 'Task updated successfully', task: updatedTask });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete Task endpoint
app.delete('/tasks/:taskID', async (req, res) => {
    const { taskID } = req.params;
    try {
        // Find the task by taskID and delete it
        const deletedTask = await Task.findOneAndDelete({ taskID: parseInt(taskID) });

        if (!deletedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        return res.status(200).json({ message: 'Task deleted successfully', task: deletedTask });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create Subtask endpoint
app.post('/subtasks', async (req, res) => {
    const { taskID, title, description, deadline, status } = req.body;
    try {
        // Get the current maximum subTaskID from the database
        const lastSubTask = await SubTask.findOne().sort({ subTaskID: -1 });
        const subTaskID = lastSubTask ? lastSubTask.subTaskID + 1 : 1;

        // Create a new subtask with the incremented subTaskID and task ID
        const newSubTask = new SubTask({ subTaskID, taskID, title, description, deadline, status });
        await newSubTask.save();

        return res.status(201).json({ message: 'Subtask created successfully', subTaskID });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get subtasks by taskID endpoint
app.get('/subtasks/:taskID', async (req, res) => {
    const { taskID } = req.params;
    try {
        // Find subtasks based on the provided taskID
        const subtasks = await SubTask.find({ taskID: parseInt(taskID) });

        return res.status(200).json(subtasks);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Edit Subtask endpoint
app.put('/subtasks/:subTaskID', async (req, res) => {
    const { subTaskID } = req.params;
    const { title, description, deadline, status } = req.body;
    try {
        // Find the subtask by subTaskID and update its properties
        const updatedSubTask = await SubTask.findOneAndUpdate(
            { subTaskID: parseInt(subTaskID) },
            { title, description, deadline, status },
            { new: true } // Return the updated subtask
        );

        if (!updatedSubTask) {
            return res.status(404).json({ error: 'Subtask not found' });
        }

        return res.status(200).json({ message: 'Subtask updated successfully', subTask: updatedSubTask });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete Subtask endpoint
app.delete('/subtasks/:subTaskID', async (req, res) => {
    const { subTaskID } = req.params;
    try {
        // Find the subtask by subTaskID and delete it
        const deletedSubTask = await SubTask.findOneAndDelete({ subTaskID: parseInt(subTaskID) });

        if (!deletedSubTask) {
            return res.status(404).json({ error: 'Subtask not found' });
        }

        return res.status(200).json({ message: 'Subtask deleted successfully', subTask: deletedSubTask });
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
