import { createHTML } from "./embed_to_html.mjs";
import express from 'express';

const app = express()

app.get('/search/v1',(req,res)=>{
    const items = req.query['count'];
    const time = req.query['days'];
    const search_term = req.query['search'];
    createHTML(false,search_term,time,items).then(html=>{
        res.header('content-type','text/html').send(html)
    })
})

app.get('/search/v2',(req,res)=>{
    const items = req.query['count'];
    const time = req.query['days'];
    const search_term = req.query['search'];
    createHTML(true,search_term,time,items).then(html=>{
        res.header('content-type','text/html').send(html)
    })
})

app.listen(3000)