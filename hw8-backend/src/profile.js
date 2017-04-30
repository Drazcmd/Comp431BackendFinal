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

    app.get('/avatars/:user?', isLoggedInMiddleware, avatars)
    app.put('/avatar', isLoggedInMiddleware, uploadAvatar)

    app.get('/dob', isLoggedInMiddleware, dob)
}

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

/**
 * Will work for any generic profile field that uses the same format for access
 * in our internal database and response in the API as email, zipcode, and birth
 *
 * Note how these do NOT allow multiple inputted user ids - it takes just one!
 */
const getStandardProfileField = (res, fieldKey, requestedUser) => {
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
    getStandardProfileField(res, 'email', requestedUser) 
}
const zipcode = (req, res) => {
    const requestedUser = req.params.user ? req.params.user : req.userObj.username
    getStandardProfileField(res, 'zipcode', requestedUser) 
}
const dob = (req, res) => {
    const loggedInUser = req.userObj.username
    getStandardProfileField(res, 'dob', loggedInUser)
}


/**
 * Usually for setProfileField the value of newData is coming from a POST or 
 * PUT, wth the new value grabbed from inside req.body. The fieldKey is from
 * whichever endpoint route the HTTP request got sent to.
*/
const setProfileField = (res, username, fieldKey, newData) => {
    if (!(username && fieldKey && newData)){
        console.log('missing some necessary info to set a profile field')
        console.log('input to function:', username, fieldKey, newData)
        res.sendStatus(400)
        return
    }
    //Sadly, it's impossible to do this cleanly without mutation :/
    const updateValueOnDatabase = {}
    updateValueOnDatabase[fieldKey] = newData

    //First arg is the filter, second is the updated stuff, third arg specifies
    //whether it will return the new value (after being updated) or the prior value
    model.Profile.findOneAndUpdate(
        {'username': username}, updateValueOnDatabase, {'new':true}
    ).then(responseFromDatabase => {
        console.log('response to the update:', responseFromDatabase)

        //gotta do the same mutation trick again here :/
        const responseToClient = {'username': responseFromDatabase.username}
        responseToClient[fieldKey] = responseFromDatabase[fieldKey]

        res.send(responseToClient)
    }).catch(err => {
        console.log('problem with updating password:', err)
        res.sendStatus(400)
    })
}

/**
 * (All of these only are allowed for the logged in user) 
 * Unlike with GET headline, this one is basically the exact same as the
 * corresponding email and zipcode PUTs
 */
const putHeadline = (req, res) => {
    if (!(req.body.headline)) {
        res.sendStatus(400)
    } else {
        const userObj = req.userObj
        const newHeadline = req.body.headline
        setProfileField(res, userObj.username, 'status', newHeadline) 
    }
}
const putEmail = (req, res) => {
     if (!req.body.email) {
        res.sendStatus(400)
     } else {
        const userObj = req.userObj
        const newEmail = req.body.email
        setProfileField(res, userObj.username, 'email', newEmail) 
     }
}
const putZipcode = (req, res) => {
     if (!req.body.zipcode) {
        res.sendStatus(400)
     } else {
        const userObj = req.userObj
        const newZipcode = req.body.zipcode
        setProfileField(res, userObj.username, 'zipcode', newZipcode) 
    }

}
const avatars  = (req, res) => {
    //NOTE - despite the optional input parameter being called 'user' here, it's
    //actually possibly a comma separated list (like headline's 'users')
    const requestedUsers = req.params.user ? req.params.user : req.userObj.username
    const handleMongooseQuery = buildProfileQueryHandler(true);
    handleMongooseQuery(requestedUsers)
    .then(response => {
        console.log('got these profiles back:', response)
        const requestedAvatarObjs = response.map(profile => ({
            username: profile.username,
            avatar: profile.picture
        }))
        console.log('Which we format as ', requestedAvatarObjs)
        res.send({ avatars: requestedAvatarObjs})
    })
    .catch(err => {
        console.log('Problem with database query?:', err)
        res.sendStatus(400)
    })
}

//This guys is the only endpoint we're allowed to stub for this assignment!
const uploadAvatar = (req, res) => {
    res.send({
        username: req.userObj.username, 
        avatar: 'http://random-ize.com/lorem-ipsum-generators/lorem-ipsum/lorem-ipsum.jpg'
    })
}
