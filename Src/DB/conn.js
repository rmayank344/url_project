const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE,{
    useNewUrlParser: true,
    useUnifiedTopology:true
}).then( () => {
    console.log("Connected to MongoDb");
}).catch( (err) => {
    console.log("Error connecting to Mongo");
});