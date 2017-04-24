const model = require('./model.js')
const isLoggedInMiddleware = require('./auth').isLoggedInMiddleware
exports.setup = function(app){
    //note this is the only one with :users rather than :user
    app.get('/headlines/:users?', isLoggedInMiddleware, headlines)
    app.put('/headline', isLoggedInMiddleware, putHeadline)

    app.get('/email/:user?', email)
    app.put('/email', putEmail)

    app.get('/zipcode/:user?', zipcode)
    app.put('/zipcode', putZipcode)

    app.get('/avatars/:user?', avatars)
    app.put('/avatar', uploadAvatar)

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
     const validOperation = (profile[fieldKey] && newData)
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
const headlines = (req, res) => {  
    //Again, note that it's :users - not :user. These are comma separated
    //If not provided, we use the logged in user (and put it into an array 
    //so that we can use the same 'username in requestedUsers' regardless of which)
    console.log('incomign headline request for these users:', req.users)
    const requestedUsers = req.users ? req.users.split(',') : Array.of(req.userObj.username)
    const databaseFilter = {'username': {$in: requestedUsers}}
    console.log('this means the database request looks like', databaseFilter)
    model.Profile.find(databaseFilter)
    .then(response => {
        console.log('got these profiles back:', response)
        const requestedHeadlineObjs = response.map(profile => ({
            username: profile.username,
            headline: profile.status
        }))
        console.log('Which we format as ', requestedHeadlineObjs)
        res.send({ headlines: requestedHeadlineObjs})
    })
    .catch(err => {
        console.log('Problem with database query?:', err)
        res.sendStatus(400)
    })


}

const putHeadline = (req, res) => {
/* todo  change 
    model.Article(newArticle).save()
    .then(response => {
        console.log('database response:', response) 
        //eventually we'll need to check if we must add an image in
        const returnedArticle = formatArticleForAPI(response)

        console.log('returned article:', returnedArticle)
        //note that wrapping it in an array is on purpose, not a bug!
        res.send({articles: [returnedArticle]})
    })
    .catch(err => {
        console.log(err)
        res.sendStatus(400)
    })
}*/

     //only allowed for logged in user
    if (!(req.body.headline)) {
        res.sendStatus(400)
    } else {



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
const uploadAvatar = (req, res) => {
    //only *has* to be a stub
    if (!req.body.image){
        res.sendStatus(400)
    } else {
        if (req.body) {
            setProfileField('avatar', req.body.image)
            res.send({username: user, avatar: accessField(user, 'avatar')}) 
        } else {
            res.sendStatus(402);
        }
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
