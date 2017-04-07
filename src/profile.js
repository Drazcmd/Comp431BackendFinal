exports.setup = function(app){
     app.get('/', index)
     //note this is the only one with :users rather than :user
     app.get('/headlines/:users?', headlines)
     app.put('/headline', putHeadline)

     app.get('/email/:user?', email)
     app.put('/email', putEmail)

     app.get('/zipcode/:user?', zipcode)
     app.put('/zipcode', putZipcode)

     app.get('/avatars/:user?', avatars)
     app.put('/avatar', putAvatar)

     app.get('/dob', dob)
}

//Note that according to the API, in many places I'm always using this as a 
//backup for if user isn't defined somewhere in the request.
const user = 'cmd11test'
exports.loggedInUser = user 

//(Note that user won't change since login is stubbed atm)
const profile = {
     headline: 'This is my headline!',
     email: 'cmd11test@blah.com',
     zipcode: 12345,
     avatar: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/DWLeebron.jpg/220px-DWLeebron.jpg',
     dob: 700000000000
}

//in later projects we'll be using some sort of mongo database I believe
const databaseReplacement = {
     'sep1': {
          headline: 'This a fake headline for my fake Dr. Pollack entry',
          email: 'sep1test@blah.com',
          zipcode: 13325,
          avatar: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/DWLeebron.jpg/220px-DWLeebron.jpg',
          //TODO - date of birth!

     },
     'sep2': {
          headline: 'This is the fake headline of a fake twin of Dr. Pollack',
          email: 'sep2test@blah.com',
          zipcode: 13325,
          avatar: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/DWLeebron.jpg/220px-DWLeebron.jpg',
          //TODO - date of birth!
     }
}

//Unfortunately, there's no way to use a variable as a key here 
//without doing mutation
databaseReplacement[user] = profile;

/**
 * These three functions are needed to make implementation/choice of 
 * 'database' irrelevant 
 *
 * As far as 'field', it'll generally be the first word in the endpoint; i.e.,
 * either the only thing after the url or what's specified in the requests right
 * before a ':user' or ':users'.
*/
const userExists = (username) => {
     return (username in databaseReplacement)
}
const accessField = (username, fieldKey) => {
     return userExists(username) ? databaseReplacement[username][fieldKey] : null
}
/**
 * Usually for setProfileField the value of newData is coming from a POST or 
 * PUT, wth the new value grabbed from inside req.body.
*/
const setProfileField = (fieldKey, newData) => {
     //Only valid if there's already an existing value for that fieldkey
     const validOperation = (profile.fieldKey && newData)
     if (validOperation){
          profile[fieldKey] = newData
     }
     return validOperation
}

/*
These functions are all for handling request at vairous endpoints. If the
name of the funciton doesn't cluse you in as to whether it is a 'POST' or
'PUT' or whatever, assume it's for a 'GET' request.

See the API at https://www.clear.rice.edu/comp431/data/api.html#api
*/
const index = (req, res) => {
     res.send({ hello: 'world' })
}
const headlines = (req, res) => {  
     //again, note that it's :users - not :user. These are comma separated
     if (!req.users) req.users = user
     const requestedUsers = req.users.split(',')
     const requestedHeadlineObjs = requestedUsers.map((user) => {
          return {
               username: req.user,
               headline: accessField(req.users, 'headline')
          } 
     })
     res.send({ headlines: requestedHeadlineObjs})
}

const putHeadline = (req, res) => {
     //only allowed for logged in user
     if (!(req.body.headline)) {
        res.sendStatus(400)
     } else {
          setProfileField('headline', req.body.headline)
          res.send({username: req.user, headline: profile.headline})
     }     
}

const email = (req, res) => {
     if (!req.user) req.user = user
     if (userExists(req.user)) {
          res.send({ 
               username: req.user,
               email: accessField(req.user, 'email')
          })
     } else {
          res.sendStatus(404)
     }

     res.send({username: req.user, email: req.body.email}) 
}

const putEmail = (req, res) => {
     //(only allowed for logged in user)
     if (!req.body.email) {
          res.sendStatus(400)
     } else {
          setProfileField('email', req.email)
          res.send({username: req.user, email: req.body.email})
     }
}

const zipcode = (req, res) => {
     if (!req.user) req.user = user
     if (userExists(req.user)) {
          res.send({
               username: req.body.username,
               zipcode: accessField(req.user, 'zipcode')
          })
     } else {
          res.sendStatus(404)
     }
}
const putZipcode = (req, res) => {
     //only allowed for logged in user
     if (!req.body.zipcode) {
          res.sendStatus(400)
     } else {
          setProfileField('zipcode', req.body.zipcode)
          res.send({username: req.user, zipcode: req.body.zipcode}) 
     }
}
const avatars  = (req, res) => {
     //despite being 'user' it's actually possibly a comma separated list
     //like headline's 'users'
     if (!req.user) req.user = user
     res.send({avatars: [
          { username: req.user, avatar: profile.avatar}
     ]})
}
const putAvatar = (req, res) => {
     //only allowed for logged in user
     //TODO - this one is a bit odd...
     if (!req.body.image){
          res.sendStatus(400)
     } else {
          setProfileField('avatar', req.body.image)
          res.send({username: user, avatar: accessField(user, 'avatar')}) 
     }
}
const dob = (req, res) => {
     //I think the API had a typo here. Gonna assume it should rally be like
     //the other GET requsts, just without a corresponding PUT to update it.
     if (!req.user) req.user = user
     res.send(
          { username: req.user, dob: profile.dob}
     )
}
