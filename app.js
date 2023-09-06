const express = require('express');
const http = require('http');
const morgan = require("morgan");
const { createProxyMiddleware } = require('http-proxy-middleware');


const port = 3000;

const app = express();
app.use('/', express.static(__dirname));


const cors = require('cors');
app.use(cors({
    origin: '*'
}));



app.use(morgan("dev"));

app.use('/records', createProxyMiddleware({
    target: "https://pkc-rgm37.us-west-2.aws.confluent.cloud:443/kafka/v3/clusters/lkc-2rgw32/topics/user-clicks/records",
    changeOrigin: true,
    pathRewrite: {
        [`^/records`]: '',
    },
}));


app.use('/qna', createProxyMiddleware({
    target: "http://ec2-54-216-127-120.eu-west-1.compute.amazonaws.com:5001/qna",
    changeOrigin: true,
    pathRewrite: {
        [`^/qna`]: '',
    },
}));


/*
app.use('/findOne', createProxyMiddleware({
    target: "https://us-east-2.aws.data.mongodb-api.com/app/data-wurzs/endpoint/data/v1/action/findOne",
    changeOrigin: true,
    pathRewrite: {
        [`^/findOne`]: '',
    },
}));
*/

app.use('/v1', createProxyMiddleware({
    target: "https://us-east-2.aws.data.mongodb-api.com/app/data-wurzs/endpoint/data/v1/",
    changeOrigin: true,
    pathRewrite: {
        [`^/v1`]: '',
    },
}));


const server = http.createServer(app);
server.listen(port, () => console.log(`Server started on port localhost:${port}`));
