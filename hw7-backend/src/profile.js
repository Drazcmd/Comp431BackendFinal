const model = require('./model.js')
const isLoggedInMiddleware = require('./auth').isLoggedInMiddleware
exports.setup = function(app){
    //note this is the only one with :users rather than :user
    app.get('/headlines/:users?', isLoggedInMiddleware, headlines)
    app.put('/headline', isLoggedInMiddleware, putHeadline)

    app.get('/email/:user?', isLoggedInMiddleware, email)
    app.put('/email', isLoggedInMiddleware, putEmail)

    app.get('/zipcode/:user?', isLoggedInMiddleware, zipcode)
    app.put('/zipcode', isLoggedInMiddleware, putZipcode)

    app.get('/avatars/:user?', avatars)
    app.put('/avatar', uploadAvatar)

    app.get('/dob', isLoggedInMiddleware, dob)
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

/*
 * Builds a function to handle qurying the mongoose db. Returns
 * a promise for the results of said query.
 *
 * One usage example:
 * const handleRequest = buildProfileQueryHandler('email', false);
 * handleRequest('cmd11test').then(response => ...);
 */
const buildProfileQueryHandler = (multipleUsersAllowed) => {
    return (userParam => {
        //userParam sometimes has to be a single user (see /email/:user?), and 
        //sometimes has to be a comma separated lsit of them (see avatars/:user?)
        const santiziedUserParam = multipleUsersAllowed 
            ? userParam.split(',') 
            : userParam
        const databaseFilter = multipleUsersAllowed
            ? {'username': {$in: santiziedUserParam}} 
            : {'username': santiziedUserParam}
        return model.Profile.find(databaseFilter)
    })
}

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
    //Note that it's :users - not :user. This is a bit atypical
    console.log('incomign headline request for these users:', req.params.users)

    //If not provided, we use the logged in user (and put it into an array 
    //so that we can use the same 'username in requestedUsers' regardless of which)
    const requestedUsers = req.params.users ? req.params.users : req.userObj.username
    const handleMongooseQuery = buildProfileQueryHandler(true);
    handleMongooseQuery(requestedUsers)
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


/**
 * Will work for any generic profile field that uses the same format for access
 * in our internal database and response in the API as email, zipcode, and birth
 *
 * Note how these do NOT allow multiple inputted user ids - it takes just one!
 */
const getStandardProfileField = (fieldKey, requestedUser, res) => {
    console.log('accessing this field:', fieldKey, 'for this user', requestedUser)
    const handleMongooseQuery = buildProfileQueryHandler(false);
    handleMongooseQuery(requestedUser)
    .then(response => {
        const returnedProfile = response[0]
        console.log('got this profile back:', returnedProfile)
        //See piazza @186 - this behavior differs from the dummy webserver, and
        //is a 'good' way to handle it; the way the dumy server is responds is 'bad'
        if (returnedProfile) {
            //Unforunately, no good way to do this key other than mutation (since
            //we don't actually know if it's for email or for zipcode atm)
            const requestedObj = { 'username': returnedProfile.username }
            //Only other way we might do this is by using a switch, but that
            //enforces specific state reptition on this function in a bad manner
            requestedObj[fieldKey] = returnedProfile[fieldKey]
            console.log('which we format for return as', requestedObj)
            res.send(requestedObj)
        } else {
            console.log('Clearly, the provided userId was not of an existing user')
            console.log('As per piazza @186, the proper response in this case is 404')
            res.sendStatus(404)
        }
    })
    .catch(err => {
        console.log('Problem with database query?:', err)
        res.sendStatus(400)
    })
}

//Yes, technically there's still some code duplication. HOWEVER, these requests 
//SHOULDN'T be forced to use the same exact method for reading the input, given 
//how there are exceptions like date of birth (which is otherwise the same)
const email = (req, res) => {
    const requestedUser = req.params.user ? req.params.user : req.userObj.username
    getStandardProfileField('email', requestedUser, res) 
}
const zipcode = (req, res) => {
    const requestedUser = req.params.user ? req.params.user : req.userObj.username
    getStandardProfileField('zipcode', requestedUser, res) 
}
const dob = (req, res) => {
    const loggedInUser = req.UserObj.username
    getStandardProfileField('dob', loggedInUser, res)
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
