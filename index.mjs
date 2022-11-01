import { createHTML } from "./embed_to_html.mjs";
import express from 'express';

const app = express()

app.get('/top',(req,res)=>{
    const items = req.query['count'];
    const time = req.query['days'];
    const search_term = req.query['search'];
    createHTML(search_term,time,items).then(html=>{
        res.header('content-type','text/html').send(html)
    })
})

app.listen(3000)