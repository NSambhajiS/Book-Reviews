import express from "express";
import pg from "pg";
import "dotenv/config";
import axios from "axios"; //for fetching book covers

const app=express();
const port=3000;

app.use(express.urlencoded({extended:true})); //middleware for form data
app.use(express.json());  //middleware for JSON data
app.use(express.static("public"));

const db=new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const connectDB = async () => {
    try {
        await db.connect();
        console.log("✅ Connected to PostgreSQL");
    } catch (err) {
        console.error("❌ Database connection error:", err.message);
    }
};

// Call the function to connect
connectDB();

app.get("/",async (req,res)=>{
    try{
        const result=await db.query("SELECT * FROM books");
        const books=result.rows;
        res.render("index.ejs",{books:books});
    }catch(err){
        console.error(err.message);
    }
})

app.get("/add",async (req,res)=>{
    try{
        res.render("add.ejs");
    }catch(err){
        console.error(err.message);
    }
});

app.post("/add",async (req,res)=>{
    //title,author,revew,rating
    const title=req.body.newTitle;
    const author=req.body.newAuthor;
    const review=req.body.newReview;
    const rating=req.body.newRating;
    const currentTime = new Date(); // Get the current timestamp

    try{
        //fetch cover URL from open library API
        const openLibResponse = await axios.get(
            `https://openlibrary.org/search.json?title=${title}&author=${author}`
        );

        let cover_url=null;
        let openlib_id=null;

        if(openLibResponse.data.docs.length>0){
            openlib_id=openLibResponse.data.docs[0].cover_edition_key;
            if(openlib_id){
                cover_url=`https://covers.openlibrary.org/b/olid/${openlib_id}-L.jpg`;
            }
        }

        //insert into db
        await db.query(
            "INSERT INTO books (title,author,review,rating,cover_url, openlib_id, created_at) VALUES ($1,$2,$3,$4,$5, $6, $7)",
            [title,author,review,rating, cover_url, openlib_id, currentTime]
        );
        res.redirect("/");
    }catch(err){
        console.error(err.message);
    }
});

app.get("/search",async (req,res)=>{
    try{
        const query=req.query.query;
        const result=await db.query(
            "SELECT * FROM books WHERE title ILIKE $1",
            [`%${query}%`]
        );
        // If no books are found, pass an empty array
        const books = result.rows.length > 0 ? result.rows : [];  
        console.log(result.rows);  // Log to check what the database returns

        res.render("index.ejs", { books });  // Pass books to EJS
    }catch(err){
        console.error(Array.message);
    }
});

app.get("/edit/:id",async (req,res)=>{
    try{
        const bookId=req.params.id;
        const result=await db.query(
            "SELECT * FROM books WHERE id=$1",
            [bookId]
        );

        if(result.rows.length>0){
            const book=result.rows[0];
            res.render("edit.ejs",{book:book});
        }else{
            res.status(404).send("Book not found");
        }
    }catch(err){
        console.error(err.message);
    }
    
});

app.post("/update/:id", async (req,res)=>{
    try{
        const bookId=req.params.id;
        const {title,author,rating,review}=req.body;
        const currentTime = new Date(); // Get the current timestamp

        //fetch cover URL from open library API
        const openLibResponse = await axios.get(
            `https://openlibrary.org/search.json?title=${title}&author=${author}`
        );

        let cover_url=null;
        let openlib_id=null;

        if(openLibResponse.data.docs.length>0){
            openlib_id=openLibResponse.data.docs[0].cover_edition_key;
            if(openlib_id){
                cover_url=`https://covers.openlibrary.org/b/olid/${openlib_id}-L.jpg`;
            }
        }
        
        const result=await db.query(
            "UPDATE books SET title=$1 , author=$2, rating=$3,review=$4,cover_url=$5, openlib_id=$6, created_at=$7 WHERE id=$8",
            [title, author, rating, review,cover_url, openlib_id, currentTime, bookId]
        );
        res.redirect("/");
    }catch(err){
        console.error(err.message);
    }
});

app.post("/delete/:id",async (req,res)=>{
    try{
        const deleteId=req.params.id;

        await db.query(
            "DELETE FROM books WHERE ID=$1",
            [deleteId]
        )

        res.redirect("/");
    }catch(err){
        console.error(err.message);
    }
});

app.listen(port,()=>{
    console.log(`Server running on port ${port}.`);
});