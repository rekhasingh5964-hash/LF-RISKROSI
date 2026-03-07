const Jimp = require('jimp');

async function processImage() {
    try {
        const image = await Jimp.read('public/assets/lf_riskrosi_logo.png');

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            // x, y is the position of this pixel on the image
            // idx is the position start position of this rgba tuple in the bitmap Buffer
            // this is the image
            const red = this.bitmap.data[idx + 0];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];

            // if black (or very close to it)
            if (red < 30 && green < 30 && blue < 30) {
                // Set alpha channel to 0
                this.bitmap.data[idx + 3] = 0;
            } else {
                // Option to avoid hard jagged edges: 
                // If not completely black but very dark, make it partially transparent
            }
        });

        // Save the result back to the same file (transparent background)
        await image.writeAsync('public/assets/lf_riskrosi_logo.png');
        console.log("Transparency applied!");
    } catch (err) {
        console.error("Error processing image:", err);
    }
}

processImage();
