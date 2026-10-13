
var express = require("express");
var fs = require("fs");
var path = require("path");

var app = express();
var PORT = process.env.PORT || 3000;

var publicFolder = path.join(__dirname, "public");
var dataFile = path.join(__dirname, "donations.json");

app.use(express.json());
app.use(express.static(publicFolder));

// Read donation records
function readDonations() {
    try {
        if (!fs.existsSync(dataFile)) {
            fs.writeFileSync(dataFile, "[]", "utf8");
        }

        var data = fs.readFileSync(dataFile, "utf8");
        var donations = JSON.parse(data);

        return Array.isArray(donations) ? donations : [];
    } catch (error) {
        throw new Error("Unable to read donation records.");
    }
}

// Save donation records
function saveDonations(donations) {
    fs.writeFileSync(
        dataFile,
        JSON.stringify(donations, null, 2),
        "utf8"
    );
}

// Validate donation input
function validateDonation(body) {
    var donor = typeof body.donor === "string" ? body.donor.trim() : "";
    var food = typeof body.food === "string" ? body.food.trim() : "";
    var quantity = Number(body.quantity);
    var location = typeof body.location === "string" ?
        body.location.trim() : "";
    var contact = typeof body.contact === "string" ?
        body.contact.trim() : "";

    if (!donor || !food || !location || !contact) {
        return "Please fill in all fields.";
    }

    if (donor.length > 100 || food.length > 100 ||
        location.length > 200 || contact.length > 100) {
        return "One or more fields are too long.";
    }

    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) {
        return "Quantity must be a positive number.";
    }

    return null;
}

// API: Get all donations
app.get("/api/donations", function (req, res) {
    try {
        res.json(readDonations());
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// API: Add a donation
app.post("/api/donations", function (req, res) {
    var errorMessage = validateDonation(req.body || {});

    if (errorMessage) {
        return res.status(400).json({ message: errorMessage });
    }

    try {
        var donations = readDonations();

        var donation = {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
            donor: req.body.donor.trim(),
            food: req.body.food.trim(),
            quantity: Number(req.body.quantity),
            location: req.body.location.trim(),
            contact: req.body.contact.trim(),
            createdAt: new Date().toISOString()
        };

        donations.unshift(donation);
        saveDonations(donations);

        res.status(201).json({
            message: "Donation added successfully!",
            donation: donation
        });
    } catch (error) {
        res.status(500).json({ message: "Could not save donation." });
    }
});

// API: Update a donation
app.put("/api/donations/:id", function (req, res) {
    var errorMessage = validateDonation(req.body || {});

    if (errorMessage) {
        return res.status(400).json({ message: errorMessage });
    }

    try {
        var donations = readDonations();
        var index = donations.findIndex(function (item) {
            return item.id === req.params.id;
        });

        if (index === -1) {
            return res.status(404).json({ message: "Donation not found." });
        }

        donations[index] = {
            id: donations[index].id,
            donor: req.body.donor.trim(),
            food: req.body.food.trim(),
            quantity: Number(req.body.quantity),
            location: req.body.location.trim(),
            contact: req.body.contact.trim(),
            createdAt: donations[index].createdAt
        };

        saveDonations(donations);

        res.json({
            message: "Donation updated successfully!",
            donation: donations[index]
        });
    } catch (error) {
        res.status(500).json({ message: "Could not update donation." });
    }
});

// API: Delete a donation
app.delete("/api/donations/:id", function (req, res) {
    try {
        var donations = readDonations();
        var updatedDonations = donations.filter(function (item) {
            return item.id !== req.params.id;
        });

        if (updatedDonations.length === donations.length) {
            return res.status(404).json({ message: "Donation not found." });
        }

        saveDonations(updatedDonations);

        res.json({ message: "Donation deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Could not delete donation." });
    }
});

// Open the website
app.get("/", function (req, res) {
    res.sendFile(path.join(publicFolder, "index.html"));
});

// Start the server
app.listen(PORT, function () {
    console.log("FoodShare server running at http://localhost:" + PORT);
});
