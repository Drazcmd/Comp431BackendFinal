exports.setup = function(app){
     app.get('/', index)
     app.get('/headlines/:users?', headlines)
     app.put('/headline', putHeadline)

     app.get('/email/:users?', email)
     app.put('/email', putEmail)

     app.get('/zipcode/:users?', zipcode)
     app.put('/zipcode', putZipcode)

     app.get('/avatars/:users?', avatars)
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
const databaseReplacement = {}
databaseReplacement[user] = profile

const userExists = (username) => {
     return username in databaseReplacement
}

const headlines = (req, res) => {  
     if (!req.users) req.users = user
     console.log(req.users)
     if (userExists(req.users)) {
          console.log('todo - need to split up input')
          res.send({ headlines: [ 
               { username: req.users, headline: profile.headline } 
          ]}) 
     } else {
          console.log('todo!')
     }
}

const putHeadline = (req, res) => {
     const onlyAllowedUser = user
     if (!req.body.headline) {
          console.log("TODO - implement sending back an error")
     } else {
          profile.headline = req.body.headline
          res.send({username: req.users, headline: profile.headline})
     }     
}

const email = (req, res) => {
     if (!req.users) req.users = user
     console.log(req.users)
     if (userExists(req.users)) {
          console.log('todo - need to split up input')
          res.send({ headlines: [ 
               { username: req.users, headline: profile.headline } 
          ]}) 
     } else {
          console.log('todo!')
     }
}
     if (!req.email) req.email = profile.email
     if (!req.users) req.users = user
     res.send({username: req.users, email: req.email})
}
const putEmail = (req, res) => {
     if (!req.users) req.users = user
     res.send({username: req.users, email: req.body.email}) 
}

const zipcode = (req, res) => {
     if (!req.body.username) req.body.username = user
     res.send({username: req.body.username, zipcode: profile.zipcode})
}
const putZipcode = (req, res) => {
     if (!req.users) req.users = user
     res.send({username: req.users, zipcode: req.body.zipcode}) 
}
const avatars  = (req, res) => {
     if (!req.email) req.email = profile.email
     if (!req.users) req.users = user
     res.send({avatars: [
          { username: req.users, avatar: profile.avatar}
     ]})
}
const putAvatar = (req, res) => {
     if (!req.users) req.users = user
     res.send({username: req.users, avatar: req.body.avatar}) 
}

