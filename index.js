import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut , sendPasswordResetEmail } from 'firebase/auth';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    OAth2: process.env.FIREBASE_TOKEN_URI
};

// Initialize Firebase
const app1 = initializeApp(firebaseConfig);
const auth = getAuth(app1);
admin.initializeApp({
    credential: admin.credential.cert('/etc/secrets/keg-washer-firebase-adminsdk-7ww1i-aa7938c93f.json'),
    // credential: admin.credential.cert('/etc/secrets/keg-washer-firebase-adminsdk-7ww1i-aa7938c93f.json')?admin.credential.cert('/etc/secrets/keg-washer-firebase-adminsdk-7ww1i-aa7938c93f.json'):admin.credential.cert('tempDocs/keg-washer-firebase-adminsdk-7ww1i-aa7938c93f.json'),
});

const db = getFirestore();

const app = express();

const allowedOrigins = [
    'https://yatlow.github.io',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
];

// CORS Configuration
const corsOptions = {
    origin: function(origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

    const verifyToken = async (req, res, next) => {
        console.log('Authorization header:', req);
        console.log('Authorization header:', req.headers.authorization);
        const token = req.headers.authorization?.split(' ')[1];       
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log('Decoded Token:', decodedToken);
    if (!token) {
        console.log("unautherized")
        return res.status(403).json({ message: 'Unauthorized' });
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        console.log("autherized")
        next();
    } catch (error) {
        res.status(403).json({ message: 'Token verification failed' });
        console.log("auth faild")
    }
    };


app.post('/update', verifyToken, async (req, res) => {
    try {
        const parameterVals = req.body;
        const docRef = db.collection('parameters').doc('updated');
        await docRef.set(parameterVals);
        res.status(200).json({ message: 'נתונים עודכנו בהצלחה!', data : parameterVals });
        console.log("sucssesfuly updated")
    } catch (error) {
        console.error('Error writing document:', error);
        res.status(500).json({ error: 'תקלה בתקשורת לשרת' });
        console.log("server error")
    }
});
app.post('/test-firestore', async (req, res) => {
    try {
        const { first, last, born } = req.body;
        const testDocRef = db.collection('users').doc('testDoc');

        // Try reading from Firestore first
        const doc = await testDocRef.get();
        if (!doc.exists) {
            console.log('No such document!');
        } else {
            console.log('Document data:', doc.data());
        }

        await testDocRef.set({ first, last, born });
        res.status(200).json({ message: 'Firestore write successful!' });
    } catch (error) {
        console.error('Firestore test failed:')//, error);
        res.status(500).json({
            error: 'Firestore test failed',
            // details: error.message,
            // stack: error.stack
        });
    }
});
    
// Login Route (Backend)
app.post('/login', async (req, res) => {
    const { email, password } = req.body; // Access email and password from the request body
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const customToken = await admin.auth().createCustomToken(userCredential.user.uid);
        res.json({ success: true, token: customToken });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Authentication failed' });
    }
});
app.post('/logout', async (req, res) => {
    const {email} = req.body;
    res.json({ success: 1 });
    try{
        signOut(auth);
        res=1;
        // console.log('log out')
    }catch{
        // console.log('log out fail')
    }
});


app.post('/forgotPassowrd', async (req, res) => {
    const { email } = req.body;
    try {
        await admin.auth().getUserByEmail(email);
        res.json({ success: 1 });
        // console.log('email in list:'+email)
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error('User not found');
            res.status(404).json({ success: 0 });
        } else {
            console.error('Failed to send password reset email:', error.message);
            res.status(500).json({ success: 0 });
        }
    }
});



app.post('/resetPassowrd', async (req, res) => {
    const { email } = req.body;
    try {
        await sendPasswordResetEmail(auth, email);
        // console.log('Password reset email sent');
        res.json({ success: 1});
    } catch (error) {
        console.error('Failed to send password reset email:', error.message);
            res.status(500).json({ success: 0});    
    }
});
app.get('/ping', async (req, res) => {
    res.status(200).send('server is allive');
    // console.log('server is allive');
});


// Start the server
const port = process.env.PORT || 10000;  // Use environment variable if available
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
