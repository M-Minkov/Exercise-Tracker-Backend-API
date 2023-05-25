const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require("mongoose")
const { Schema } = mongoose;

const mongoURI = process.env.MONGO_URI;


mongoose.connect(mongoURI, {useNewUrlParser: true, useUnifiedTopology: true});


app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const exerciseSchema = new Schema({
  description: String,
  duration: Number,
  date: String
}, { _id : false, _v : false})


const userSchema = new Schema({
  username: String,
  log: {
    type: [exerciseSchema],
    default: []
  }
})


const userModel = mongoose.model("user", userSchema);
const exerciseModel = mongoose.model("exercise", exerciseSchema);

/*
userModel.deleteMany({}, (err, done) => {
  console.log("deleted, gg");
  if(err) {console.log(err);}
});
*/


async function postUserCreate(req, res) {
  const userName = req.body.username
  const userDoc = new userModel({username: userName, exercise:[]});
  let userResult;

  try {
    userResult = await userDoc.save();
    
    const {_id, username} = userResult
    userResult = {_id, username};

    res.json(userResult);
  }
  catch {
    console.log("MongoDB is not connected");
    res.json({"Working":false});
  }
}



async function getAllUsers(req, res) {
  try {
    let allUsers = await userModel.find({}, '_id username log');
    res.send(allUsers);
  }
  catch {
    console.log("MongoDB is not connected");
    res.json({"Working":false});
  }
}



async function saveExercise(req, res) {
  let userId = req.params._id;
  let exerciseDescription = req.body.description;
  let exerciseDuration = req.body.duration;
  let exerciseDate = req.body.date;

  if(exerciseDate == "" || exerciseDate == undefined) {
    let currentTime = new Date();
    exerciseDate = currentTime.toString().slice(0, 15);
  }
  else{
    let dateObject = new Date(exerciseDate)
    exerciseDate = dateObject.toString().slice(0, 15);
  }

  // console.log(exerciseDate.toString());
  
  const exercise = new exerciseModel({
    description: exerciseDescription,
    duration: exerciseDuration,
    date: exerciseDate
  })
  let userUpdated;
  try {
    userUpdated = await userModel.findOneAndUpdate(
      {_id: userId},
      { $push: {log: exercise}},
      {new : true}
    );
  }
  catch {
    console.log("Not a real ID");
    res.json({"ID":false});
    return;
  }

   
  let userAndExerciseInfo = exercise.toObject();

  userAndExerciseInfo._id = userId
  userAndExerciseInfo.username = userUpdated.username;
  res.json(userAndExerciseInfo)
}


async function grabUserExercises(req, res) {
  let userId = req.query._id;
  let earliest = req.query.from;
  let latest = req.query.to;
  let maxLogs = req.query.limit;

  if(userId == undefined || userId == "") {
    return getAllUsers(req, res);
  }

  // grabs all exercises of userId
  let userExercises;
  try {
    userExercises = await userModel.findById(userId, 'log');
  }
  catch {
    console.log("Not a real ID");
    res.json({"ID":false});
    return;
  }

  return res.json(userExercises);
}


app.post("/api/users", postUserCreate);
app.get("/api/users", getAllUsers);


app.post("/api/users/:_id/exercises", saveExercise);
app.get("/api/users/:_id/logs", grabUserExercises);
app.get("/api/users/logs", grabUserExercises);


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
