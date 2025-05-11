const express = require('express');
const cors = require('cors');
require('dotenv').config()


const app = express();
const port = process.env.PORT || 5000

// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.xzoyhx1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const userCollection = client.db("PercelDelivery").collection("users");
        const parcelCollection = client.db("PercelDelivery").collection("parcels");
        const reviewCollection = client.db("PercelDelivery").collection("reviews");
        const paymentCollection = client
            .db("PercelDelivery")
            .collection("payments");

        app.post("/users", async (req, res) => {
            const users = req.body;
            const result = await userCollection.insertOne(users);
            console.log(result);
            res.send(result);
        });
        app.get("/users", async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        // --------------------------- Parcel Routes ---------------------------

        // Get a specific parcel by ID
        app.get("/parcels/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            try {
                const result = await parcelCollection.findOne(query);
                if (!result) {
                    return res.status(404).json({ message: "Parcel not found" });
                }
                res.json(result);
            } catch (error) {
                res.status(500).json({ message: "Error retrieving parcel", error: error.message });
            }
        });

        // Get recent parcels (previous parcels) sorted by booking date 
        app.get("/recentParcel", async (req, res) => {
            try {
                const recentParcels = await parcelCollection
                    .find()
                    .sort({ bookingDate: -1 })
                    .limit(6)
                    .toArray();

                res.json(recentParcels);
            } catch (error) {
                res.status(500).json({ message: "Error retrieving recent parcels", error: error.message });
            }
        });

        // Get a specific parcel's details by ID 
        app.get("/recentParcel/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            try {
                const result = await parcelCollection.findOne(filter);
                if (!result) {
                    return res.status(404).json({ message: "Parcel not found" });
                }
                res.json(result);
            } catch (error) {
                res.status(500).json({ message: "Error fetching parcel details", error: error.message });
            }
        });

        // Get parcels by email 
        app.get("/parcel/:email", async (req, res) => {
            const email = req.params.email;
            const search = req.query.search || "";
            const filter = { email: email };
            let query = {};

            if (search) {
                query = { status: { $regex: search, $options: "i" } };
            }

            try {
                const result = await parcelCollection
                    .find({ $and: [filter, query] })
                    .toArray();
                res.json(result);
            } catch (error) {
                res.status(500).json({ message: "Error retrieving parcels by email", error: error.message });
            }
        });

        // Get parcels within a specific date range 
        app.get("/parcel", async (req, res) => {
            const { gte, lte } = req.query;
            let query = {};

            try {
                if (gte && lte) {
                    query = {
                        bookingDate: {
                            $gte: new Date(gte),
                            $lte: new Date(lte),
                        },
                    };
                } else if (gte) {
                    query = { bookingDate: { $gte: new Date(gte) } };
                } else if (lte) {
                    query = { bookingDate: { $lte: new Date(lte) } };
                }

                const result = await parcelCollection.find(query).toArray();
                res.json(result);
            } catch (error) {
                res.status(500).json({ message: "Error filtering parcels by date", error: error.message });
            }
        });

        // Create a new parcel booking
        app.post("/parcel", async (req, res) => {
            const parcel = req.body;
            parcel.bookingDate = new Date();

            try {
                // Insert the new parcel into the database
                const result = await parcelCollection.insertOne(parcel);
                // Update the user's booking count
                const filter = { email: parcel.email };
                const updateDoc = {
                    $inc: { bookingCount: 1 },
                };

                await userCollection.updateOne(filter, updateDoc);

                res.json({ message: "Parcel successfully booked", result });
            } catch (error) {
                res.status(500).json({ message: "Error booking parcel", error: error.message });
            }
        });

    } finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Parcel Delivery server is running')
})

app.listen(port, () => {
    console.log(`Parcel is on the way on server ${port}`)
})
