require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

//App config
const app = express();
app.use(express.json());
app.use(express.urlencoded());
app.use(cors());

const ipv4Address = '0.0.0.0'; // Replace with your IPv4 address
const port = 9000; // Replace with your port


//DB config
mongoose.connect(
  "mongodb://localhost:27017/reminderAppDB",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => console.log("DB connected")
);

const reminderSchema = new mongoose.Schema({
  reminderMsg: String,
  remindAt: String,
  isReminded: Boolean,
  taskCompleted: Boolean,
});

const Reminder = new mongoose.model("reminder", reminderSchema);

setInterval(() => {
  Reminder.find({}, (err, reminderList) => {
    if (err) {
      console.log(err);
    }
    if (reminderList) {
      reminderList.forEach((reminder) => {
        if (!reminder.isReminded) {
          const now = new Date();
          if ((new Date(reminder.remindAt) - now) < 0) {
            Reminder.findByIdAndUpdate(
              reminder.id,
              { isReminded: true },
              (err, remindObj) => {
                if (err) {
                  console.log(err);
                }
                // Whatsapp reminding functionality by Twilio
                const accountSid = process.env.ACCOUNT_SID;
                const authToken = process.env.AUTH_TOKEN;
                const client = require("twilio")(accountSid, authToken);

                client.messages
                  .create({
                    body: reminder.reminderMsg,
                    from: "whatsapp:+14155238886",
                    to: "whatsapp:+919960438648",
                  })
                  .then((message) => {
                    console.log(message.sid);
                    // Schedule a follow-up message after one hour
                    setTimeout(() => {
                      client.messages
                        .create({
                          body: "Did you complete your health task?",
                          from: "whatsapp:+14155238886",
                          to: "whatsapp:+919960438648",
                        })
                        .then((message) => console.log(message.sid))
                        .done();
                    }, 3600000); // 3600000 milliseconds = 1 hour
                  })
                  .done();
              }
            );
          }
        }
      });
    }
  });
}, 1000);
//API routes
app.get("/getAllReminder", (req, res) => {
  Reminder.find({}, (err, reminderList) => {
    if (err) {
      console.log(err);
    }
    if (reminderList) {
      res.send(reminderList);
    }
  });
});

app.post("/addReminder", (req, res) => {
  const { reminderMsg, remindAt } = req.body;
  const reminder = new Reminder({
    reminderMsg,
    remindAt,
    isReminded: false,
    taskCompleted: false,
    
  });
  reminder.save((err) => {
    if (err) {
      console.log(err);
    }
    Reminder.find({}, (err, reminderList) => {
      if (err) {
        console.log(err);
      }
      if (reminderList) {
        res.send(reminderList);
      }
    });
  });
});

app.post("/deleteReminder", (req, res) => {
  Reminder.deleteOne({ _id: req.body.id }, () => {
    Reminder.find({}, (err, reminderList) => {
      if (err) {
        console.log(err);
      }
      if (reminderList) {
        res.send(reminderList);
      }
    });
  });
});


app.post("/updateTask", (req, res) => {
  console.log("Message has arrived");
  const { completed } = req.body; // 'yes' or 'no'
  const taskCompleted = completed.toLowerCase() === 'yes';
  console.log("Message has arrived");
  // Find the last reminder
  Reminder.findOne().sort({ _id: -1 }).exec((err, lastReminder) => {
    if (err) {
      console.log(err);
      res.status(500).send(err);
    } else if (lastReminder) {
      // Update the taskCompleted attribute of the last reminder
      Reminder.findByIdAndUpdate(
        lastReminder._id,
        { taskCompleted: taskCompleted },
        (err, updatedReminder) => {
          if (err) {
            console.log(err);
            res.status(500).send(err);
          } else {
            res.send(updatedReminder);
          }
        }
      );
    } else {
      res.status(404).send('No reminders found');
    }
  });
});

app.listen(port,ipv4Address, () => console.log("Be started"));
