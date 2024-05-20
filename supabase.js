// supabase connection
const supabaseClient = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const express = require('express');
const { dirname } = require('path');

const app = express()
const PORT = process.env.PORT; 

app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'))

const supabaseUrl = 'https://gjcxmiorsyfgsjtkjypo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqY3htaW9yc3lmZ3NqdGtqeXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYxMzYwMzYsImV4cCI6MjAzMTcxMjAzNn0.sHHVXiluHeICLNpwISWfBtwAVJxY-Wb-iX0TQjchCv4'
const supabase = createClient(supabaseUrl, supabaseKey)

app.get('/', (req, res) => {
  res.sendFile('public/about.html', { root: __dirname})
})

app.get('/about', async (req, res) => {
    console.log('attempting to GET all customers')

    const { data, error } = await supabase
        .from('About')
        .select()


    if (error) {
        console.log('Error')
        res.send(error)

    } else {
        res.send(data)
    }

})

app.post('/about', async (req, res) => {
    const { name, email, comment } = req.body;
    const { data, error } = await supabase
        .from('About')
        .insert([{ name, email, comment }]);

    if (error) {
        console.log('Error')
        res.send(error)
    
    } else {
        res.send(data)
    }
})

app.listen(PORT, () => {
    console.log(`Supabase app listening at http://localhost:${PORT}`);
  });