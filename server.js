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
  date: Date
})


const userSchema = new Schema({
  username: String,
  exerciseArray: {
    type: [exerciseSchema],
    default: []
  }
})


const userModel = mongoose.model("user", userSchema);
const exerciseModel = mongoose.model("exercise", exerciseSchema);


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
    let allUsers = await userModel.find({}, '_id username');
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

  if(exerciseDate == "") {
    exerciseDate = new Date();
  }

  console.log(exerciseDate.toString());
  
  const exercise = new exerciseModel({
    description: exerciseDescription,
    duration: exerciseDuration,
    date: exerciseDate
  })

  let userUpdated = await userModel.findOneAndUpdate(
    {_id: userId},
    { $push: {exerciseArray: exercise}},
    {new : true}
  );

  res.json(userUpdated)
}


async function grabUserExercises(req, res) {
  let userId = req.params._id;
  let earliest = req.params.from;
  let latest = req.params.to;
  let maxLogs = req.params.limit;

  let userExercises;

  if(earliest == undefined) {
    userExercises = await userModel.findOne(
      {_id: userId,
      "exerciseArray.date": { $lte: latest, $gte: earliest }
      },
      'exerciseArray'
    )
  }

  else {
    userExercises = await userModel.findOne(
      {_id: userId, },
      'exerciseArray'
    )
  }



  userExercisesEdit = userExercises.toObject();

  userExercisesEdit.count = userExercisesEdit["exerciseArray"].length;

  if(maxLogs != undefined && userExercisesEdit.count > maxLogs) {
    userExercisesEdit["exerciseArray"].length = maxLogs
  }

  console.log(userExercisesEdit);
  res.json(userExercisesEdit);
}


app.post("/api/users", postUserCreate);
app.get("/api/users", getAllUsers);


app.post("/api/users/:_id/exercises", saveExercise);
app.get("/api/users/:_id/logs", grabUserExercises);


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
