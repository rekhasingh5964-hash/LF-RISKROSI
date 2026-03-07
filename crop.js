const Jimp = require('jimp');

async function processImage() {
    try {
        const image = await Jimp.read('public/assets/lf_riskrosi_logo.png');

        // Auto-crop to remove transparent borders
        image.autocrop();

        await image.writeAsync('public/assets/lf_riskrosi_logo.png');
        console.log("Cropped!");
    } catch (err) {
        console.error("Error cropping:", err);
    }
}

processImage();
