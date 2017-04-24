require('./db.js')
const mongoose = require('mongoose')
//see http://mongoosejs.com/docs/promises.html - the standard 
//mongoose promise is deprecated and using it prints a warning
mongoose.Promise = global.Promise;

//see https://www.clear.rice.edu/comp431/data/database.html
const userSchema = new mongoose.Schema({
	username: String, salt: String, hash: String
})
const profileSchema = new mongoose.Schema({
	username: String, 
	status: String,
    following: [ String ],
    email: String,
    zipcode: String,
    dob: String,
    picture: String    
})
const commentSchema = new mongoose.Schema({
	commentId: Number, author: String, date: Date, text: String
})

//note how {timestamps: true} removes need for a date field
const articleSchema = new mongoose.Schema({
	id: Number, author: String, img: String, text: String,
	comments: [ commentSchema ]
}, {timestamps: true})

exports.Article = mongoose.model('article', articleSchema)
exports.Profile = mongoose.model('profile', profileSchema)
exports.User = mongoose.model('users', userSchema)

//This is a function that I will be mainly using to distinguish between
//inputted article ids and usernames
exports.isPossibleId = mongoose.Types.ObjectId.isValid