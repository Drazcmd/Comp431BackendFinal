const express = require('express')
const bodyParser = require('body-parser')
//Only needed for validating inputted ids as possible articleIds
const mongoose = require('mongoose')
const model = require('./model.js')
const isLoggedInMiddleware = require('./auth').isLoggedInMiddleware
const findFollowees = require('./following').findFollowees

exports.setup = function(app){
    app.use(bodyParser.json())
    app.get('/articles/:id?', isLoggedInMiddleware, getArticles)
    app.post('/article', isLoggedInMiddleware, postArticle)
    app.put('/articles/:id', isLoggedInMiddleware, putArticles)
}

//Next week we'll need to account for images as well
const formatArticleForAPI = (dbArticle) => ({
    id: dbArticle._id,
    author: dbArticle.author,
    text: dbArticle.text,
    date: dbArticle.createdAt,
    comments: dbArticle.comments.map(comment => formatCommentForAPI(comment))
});
const formatCommentForAPI = (dbComment) => ({
    commentId: dbComment._id,
    author: dbComment.author,
    text: dbComment.text, 
    date: dbComment.createdAt
});

/**
 * Adds a new article to the list of articles, and returns the 
 * newly added article (not all the articles!). However, according
 * to the api specificaiton, even though it just sends one article back,
 * that article has to be wrapped in an array accessed by key 'articles'
 * On later assignments this will have to allow images (text only right now)
*/
const postArticle = (req, res) => {
    //see https://www.clear.rice.edu/comp431/data/database.html
    //near the bottom for why we no logner populate the 'id' field ourselvsss
    if (!req.body.text) {
        res.sendStatus(400)
        return
    }
    const newArticle = {
        author:req.userObj.username,
        text:req.body.text,
        comments: []
    }
    //since the schema has {timestamps: true} it'll automatically set
    //createdAt for us (in addition to updatedAt)
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
}

/*
 * On no id we just return everything, and according to the API on an id of an
 * author we return all articles by said author, and on an id of an
 * article we return just that article
 *
 * However, this week we can ignore authors/following stuff and just return the whole 
 * database whenever we receive a 'GET /articles'. So all we need to support
 * is /articles and /articles/id (where id can be a username or an article id)
*/
const getArticles = (req, res) => {
    console.log('getting the articles...')
    //This week only if an id is provided it HAS to be an article id, can't be a userId
    const id = req.params.id
    if (id && !model.isPossibleId(id)){
        //In this case, they gave us an id, but it doesn't fit the format of a valid article 
        //id since it isn't an _id mongoose might give to a docuemnt. We can simply return 
        //an empty array. Next week this will have to change, as it's likely a userId 
        console.log('provided id is invalid!')
        res.send({articles:[]})
    } else {
        //Now we know that either the id is a valid article id or doesn't exist at all,
        //These are both likely to return articles - either a single article (if one with 
        //its id exists - otherwise none) or the first ten articles articles posted by the 
        //people the logged in user is following.
        if (id && model.isPossibleId(id)){
            const databaseFilter = {'_id': id}
            model.Article.find(databaseFilter)
            .then(response => {
                console.log('got these articles back:', response)
                const returnedArticles = response.map(formatArticleForAPI)
                console.log('Formatted for the client, looks like this:', returnedArticles)
                res.send({articles: returnedArticles})
            })
            .catch(err => {
                console.log('Problem with database query?:', err)
                res.sendStatus(400)
            })
        } else {
            //Need to limit it to just documnts of followed users, so things
            //will end up looking very very different syntactically and structurally
            //(this is why I had to give up on a generic get artilces function)
            findFollowees(req.userObj.username)
            .then(following => {
                const usersWanted = [...following, req.userObj.username]
                const databaseFilter = {'author': {$in: usersWanted}}
                //note that paginatino isn't required here, but we DO need to
                //limit it to just the ten most recent
                model.Article.find(databaseFilter, null,  { sort: {'created_at': -1}, limit: 10 })
                .then(response => {
                    console.log('got these articles back:', response)
                    const returnedArticles = response.map(formatArticleForAPI)
                    console.log('Formatted for the client, looks like this:', returnedArticles)
                    res.send({articles: returnedArticles})
                })
                .catch(err => {
                    console.log('Problem with database query (lots of artticles)?:', err)
                    res.sendStatus(400)
                })
            })
            .catch(err => {
                console.log("problem with getting articles?", err)
                res.sendStatus(400)
            })
        }
    }
}

const respondToPutArticles = (databaseResponse, res) => {
    //eventually we'll need to check if we must add an image in
    const returnedArticle = formatArticleForAPI(databaseResponse)
    console.log('returned article:', returnedArticle)

    //note that wrapping it in an array is on purpose, not a bug!
    res.send({articles: [returnedArticle]})
}

/*
 * Diffeerent from POST article - this has to do with either editing article text
 * or positing or editing comments. That being said, it's only stubbed here
*/
const putArticles = (req, res) => {
    const id = req.params.id
    const newText = req.body.text
    //This endpoint is pretty complicated, as it really has three different 
    //functions it needs to be able to handle (all of them need to pass in some
    //text to update a thing though, plus have an article's id).
    if (!id || !model.isPossibleId(id) || !newText) {
        res.sendStatus(400)
        return
    }

    const databaseFilter = {'_id': id}
    model.Article.find(databaseFilter)
    .then(response => {
        if (!(response[0])){
            res.sendStatus(404)
            return
        }
        const articleToUpdate = response[0]
        return articleToUpdate
    })
    .then(articleToUpdate => {
        handlePutArticlesAction(req, res, articleToUpdate, id, newText)
    })
    .catch(err => {
        console.log("could not find the article??", err)
        res.sendStatus(404)
    })
}

const handlePutArticlesAction = (req, res, articleToUpdate, id, newText) => {
    //First: Posting a new comment. Do this when commentId equals -1
    if (req.body.commentId === -1){
        const existingComments = articleToUpdate.comments
        //like with articles, it'll set a createdAt and updatedAt fields
        //autmoatically because in model.js we specified {'timestamps':true}
        //OTOH, the _id is set because we're doing it as an embedded document!
        const newComment = model.Comment({author: req.userObj.username, text: newText})
        articleToUpdate.comments.push(newComment)
        articleToUpdate.save()
        .then((response) => {
            respondToPutArticles(response, res)
        }) 
        .catch(err => {
            console.log("problem with posting the comment!", err)
            res.sendStatus(400)
        })
    } else if (req.body.commentId && model.isPossibleId(req.body.commentId)){
        //Second - editing an existing comment. There's two reasons why I'm using
        //the mongoose id itself as the comment id. First, it means 0 cannot be a
        //valid id in the database (too short!) which drastically simplifies life
        //in terms of checking if it's valid. Second, it makes it wayyyy easier
        //to find and update the comment in there!
        const commentToUpdate = articleToUpdate.comments.id(req.body.commentId)
        if (!commentToUpdate) {
            res.sendStatus(404)
            return 
        }
        if (commentToUpdate.author != req.userObj.username){
            //can only update our own comments
            res.sendStatus(403)
            return
        }
        //basically, we can use parent.children.id(id) and then just save the parent
        //This is much much easier than having to take care of it ourself!
        commentToUpdate.text = newText
        articleToUpdate.save()
        .then((response) => {respondToPutArticles(response, res)})
        .catch(err => {
            console.log("problem with updating the comment!", err)
            res.sendStatus(400)
        })
    } else if (!(req.body.commentId) && req.body.commentId !== 0){
        //Third - editing an existing article. Do when commentId is not provided 
        //(Note that we need to be careful of an inputted 0 - that's an invalid
        //comment ID, not a situation where the id wasn't provided!)
        if (articleToUpdate.author != req.userObj.username){
            //can only update text form our own article
            res.sendStatus(403)
            return
        }
        articleToUpdate.text = newText
        articleToUpdate.save()
        .then((response) => {respondToPutArticles(response, res)})
        .catch(err => {
            console.log("problem with updating the article!", err)
            res.sendStatus(400)
        })
    } else {
        res.sendStatus(400)
    }
}

