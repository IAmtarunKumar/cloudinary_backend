const express = require("express");
const cloudinary = require("./config/cloudnary");
const upload = require("./config/multer");
const connection = require("./db");
const Image = require("./models/image");
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  return res.send("working");
});

app.post("/image", upload.single("image"), async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res
        .status(400)
        .json({ status: "failed", message: "No file uploaded" });
    }

    // Upload file to Cloudinary
    const result = await cloudinary.uploader
      .upload_stream(
        { folder: "WFI" }, // Optional: specify a folder in Cloudinary
        async (error, result) => {
          if (error) {
            return res
              .status(500)
              .json({ status: "failed", message: error.message });
          }

          let data = {
            name: req.file.originalname,
            imageUrl: result.secure_url,
            publicId: result.public_id,
          };

          console.log("data", data);

          const createImageDocument = new Image(data);
          await createImageDocument.save();

          return res.status(200).json({
            status: "success",
            message: "Image uploaded successfully",
            data: {
              url: result.secure_url,
              public_id: result.public_id,
            },
          });
        }
      )
      .end(req.file.buffer); // `req.file.buffer` is where multer stores the file in memory
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
});

app.get("/image" , async(req,res)=>{
    try {
        const allImage = await Image.find()
        return res.status(200).send(allImage)
    } catch (error) {
        return res.status(500).send(`Internal server error ${error.message}`)
    }
})

app.delete("/image/:id", async (req, res) => {
  try {
    let deleteData = await Image.findOneAndDelete({ _id: req.params.id });

    console.log("delete data", deleteData);

    if (!deleteData)
      return res.status(404).json({ message: "Banner not found" });
    await cloudinary.uploader.destroy(deleteData.publicId); //
    res.json({ message: "image deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/image/:id", upload.single("image"), async (req, res) => {
    try {
      // Find the image by ID
      const image = await Image.findById(req.params.id);
  
      if (!image) {
        return res.status(404).json({ message: "Banner not found" });
      }
  
      // If a file was uploaded, update the image on Cloudinary
      if (req.file) {
        // Delete the existing image from Cloudinary
        await cloudinary.uploader.destroy(image.publicId);
  
        // Upload new image to Cloudinary
        cloudinary.uploader.upload_stream({ folder: "WFI" }, async (err, result) => {
          if (err) return res.status(500).json({ message: err.message });
  
          // Update image details in MongoDB
          const updatedImage = await Image.findOneAndUpdate(
            { _id: req.params.id },
            {
              url: result.secure_url,
              publicId: result.public_id,
              name: req.file.originalname || image.name, // Update name if new file uploaded
            },
            { new: true }
          );
  
          return res.status(200).json({
            status: "success",
            message: "Banner updated successfully",
            data: updatedImage,
          });
        }).end(req.file.buffer);
      } else {
        // If no file uploaded, return without updating the image
        return res.status(400).json({ message: "No file uploaded" });
      }
    } catch (error) {
      return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
  });
  



app.listen(5500, async () => {
  try {
    await connection;
    console.log("MongoDb is connected");
  } catch (error) {
    console.log("error:", error.message);
  }
  console.log("server running on port 5500");
});
