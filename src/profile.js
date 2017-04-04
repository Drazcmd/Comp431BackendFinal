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
}

const index = (req, res) => {
     res.send({ hello: 'world' })
}

//Not 100% sure this is ok, but I'm always using it as a backup for
//if user isn't defined somewhere in the rquest. So I think it's ok?
const user = 'cmd11test'
const profile = {
     headline: 'This is my headline!',
     email: 'cmd11test@blah.com',
     zipcode: 12345,
     avatar: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/DWLeebron.jpg/220px-DWLeebron.jpg',
}

//in later projects we'll be using some sort of mongo database I believe
const databaseReplacement = {
     //Unfortunately, there's no way to use a variable as a key here 
     //without doing mutation
     'cmd11test': profile,
     'sep1': {
          headline: 'This a fake headline for my fake Dr. Pollack entry',
          email: 'sep1test@blah.com',
          zipcode: 13325,
          avatar: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/DWLeebron.jpg/220px-DWLeebron.jpg',

     },
     'sep2': {
          headline: 'This is the fake headline of a fake twin of Dr. Pollack',
          email: 'sep2test@blah.com',
          zipcode: 13325,
          avatar: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/DWLeebron.jpg/220px-DWLeebron.jpg',
     }
}


/**
These two are needed to make implementation/choice of 'database' irrelevant 
*/
const userExists = (username) => {
     return (username in databaseReplacement)
}
const accessField = (username, fieldKey) => {
     return userExists(username) ? databaseReplacement[username][fieldKey] : null
}
const setProfileField = (fieldKey, newData) => {
     //Only valid if there's already an existing value for that fieldkey
     const validOperation = (profile.fieldKey && newData)
     if (validOperation){
          profile[fieldKey] = newData
     }
     return validOperation
}

const headlines = (req, res) => {  
     //again, note that it's :users - not :user
     if (!req.users) req.users = user
     console.log(req.users)
     if (userExists(req.users)) {
          console.log('todo - need to split up input!')
          res.send({ headlines: [ 
               res.send({username: req.user, headline: accessField(req.users, 'headline'})
          ]}) 
     } else {
          console.log('todo!')
     }
}

const putHeadline = (req, res) => {
     if (!req.body.headline) {
          console.log("TODO - implement sending back an error")
     } else {
          setProfileField(req.body.headline, 'headline')
          res.send({username: req.user, headline: accessField(user, 'headline'})
     }     
}

const email = (req, res) => {
     if (!req.user) req.user = user
     if (userExists(req.user)) {
          res.send({ 
               username: req.user,
               email: accessField(req.user, 'email')
          }
     } else {
          console.log('todo! user client requested email for was invalid')
     }

     res.send({username: req.user, email: req.body.email}) 
}

const putEmail = (req, res) => {
     if (!req.email) {
          console.log('todo! user client requested email for was invalid')
     } else {
          //stubbed atm, but later will 'setProfileField('email', req.email)'
          res.send({username: req.user, email: req.email})
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
          console.log('TODO - client requested zipcode of invalid user')
     }
}
const putZipcode = (req, res) => {
     if (!req.zipcode) {
          console.log('todo! invalid PUT for zipcode')
     } else {
          //stubbed atm, but later will 'setProfileField('zipcode', req.zipcode)'
          res.send({username: req.user, zipcode: req.body.zipcode}) 
     }
}
const avatars  = (req, res) => {
     //despite being 'user' it's actually possibly a comma separated list
     //like headline's 'users'
     if (!req.user) req.user = user
     res.send({avatars: [
          { username: req.user, avatar: atar}
     ]})
}
const putAvatar = (req, res) => {
     //TODO - this one is a bit odd...
     if (!req.user) req.user = user
     res.send({username: req.user, avatar: req.body.avatar}) 
}

