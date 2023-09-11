# Basic Thumbnail Generator API
A super simple API to generate image placeholders of any color and size, as well as "thumbnails" with text overlay.

</br>

# Table of Contents
1. [Endpoints](#endpoints)
    - [`/color/:options?`](#coloroptions)
    - [`/thumbnail/:description?/:backgroundOptions?`](#thumbnaildescriptionbackgroundoptions)
    - [`/`](#)

2. [Code Example](#code-example)
3. [Setup](#running-the-server)
    - [Prerequisites](#prerequisites)
    - [Run with Node.js](#run-with-nodejs)
    - [Run the server in a Docker container](#running-the-server-in-a-container)

# Endpoints
**Assuming the server is running on `localhost:3000`, the following endpoints are available:**

## `/color/:options?`
Generates a placeholder image of a given color and size. The **options** for this endpoint are in this format:

### **`fullsize hexcode` `alpha as hexadecimal`@`width`x`height`**

Examples:
- `http://localhost:3000/color/ff0000@256x256` - A red square with 256 px sides
- `http://localhost:3000/color/0080ff80@1920x1080` - A light blue rectangle with 1920x1080 px sides and 50% opacity

### Parts of the options can be *omitted*, in which case the following defaults are used:
Option | Description
------------ | --------------------------------------------------------
`width`x`height` | If omitted altogether, the default size is `512x512 px`
`width`/`height` | If only one dimension is specified, the image is a square with that dimension
`alpha` | If omitted, the default opacity is `ff` (100%, no transparency)
`hexcode` | If omitted, the default color is randomized

Examples:
- `http://localhost:3000/color/00aa00` - A green square with 512 px sides
- `http://localhost:3000/color/ff000080@128` - A red square with 128 px sides and 50% opacity
- `http://localhost:3000/color/@640x960` - A random color rectangle with 640x960 px sides

## `/thumbnail/:description?/:backgroundOptions?`
Generates a placeholder image of a given size, with a text overlay.

### **`description`**
The text string to be displayed on the image. If omitted altogether along with the `backgroundOptions`, the default text is randomized.

*Currently, the `description` length is limited to 25 words.*

Examples:
- `http://localhost:3000/thumbnail/` - A 1200x630 px image of random color with a random text in the center. **This is literally the thumbnail placeholder generator!**
- `http://localhost:3000/thumbnail/Hello World!` - A 1200x630 px image of random color with the text "Hello World!" in the center

### **`backgroundOptions`**
Behaves the same as the `options` for the [`/color` endpoint](#coloroptions). All of the omitting rules apply here as well!

**!!! One exception is that the default **`width`x`height`** is `1200x630`.** This is the recommended size for the HTML meta image tags of most social media platforms.

Examples:
- `http://localhost:3000/thumbnail/Hello World!/ff0000@256x256` - A red square with 256 px sides, with the text "Hello World!" in the center
- `http://localhost:3000/thumbnail/Hello World!/0080ff80@1920x1080` - A light blue rectangle with 1920x1080 px sides and 50% opacity, with the text "Hello World!" in the center
- `http://localhost:3000/thumbnail/Hello World!/@640x960` - A random color rectangle with 640x960 px sides, with the text "Hello World!" in the center

### Note that you cannot omit the `description` while specify the `backgroundOptions`!
This is intended to be a thumbnail generator, so the text is *(kind of)* required. It makes much sense to myself, though you can always implement a random string generator to fill in the blanks (see [code example](#random-thumbnail-text-with-image-size-1920x1080-px)).

***<ins>Warning:</ins>*** **The following will not work!**
- `http://localhost:3000/thumbnail//ff0000@256x256` - **This will not work!** (of course it doesn't ~)

## `/`
The root of the server. This return a random thumbnail of size `1920x1080` px.

</br>

# Code Example

### Random thumbnail text with image size `1920x1080` px
The implemetation to "fix" the [limitation (*?*) above](#note-that-you-cannot-omit-the-description-while-specify-the-backgroundoptions). This is also similar to what behind the `/` endpoint.

**JavaScript**
```javascript
function randomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    // also, every 4-6 characters, insert a space
    const spaceInterval = Math.floor(Math.random() * 3) + 4;
    for (let i = 0; i < length; i++) {
        if (i % spaceInterval === 0) {
            result += ' ';
        }
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function randomThumbnail(width, height) {
    const result = await fetch(
        `http://localhost:3000/thumbnail/${randomString(randomInt(12, 40))}/@${width}x${height}`
    ).catch(err => { console.error(err) }
    );
    
    // convert the result png buffer to a base64 string
    const imageBase64 = btoa(
        new Uint8Array(await result.arrayBuffer())
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // make into a data URI (try copy and paste the result into your browser!)
    const dataURI = `data:image/png;base64,${imageBase64}`;
    console.log(dataURI); // data:image/png;base64,iVBORw0KGgoAAAAN...

    // save the image to a file
    const fs = require('fs'); // should move this to the top of the file in practice
    fs.writeFileSync('random-thumbnail.png', imageBase64, 'base64', function(err) {
        console.error(err);
    });
}

randomThumbnail(1920, 1080);
```

</br>

# Running the server
## Prerequisites
- [Node.js](https://nodejs.org/en/)
- [Docker](https://www.docker.com/) (optional, if you want to run the server in a container) [(jump!)](#running-the-server-in-a-container)

## Run with Node.js
1. Clone this repository, or download the source code as a zip file and extract it. Then, cd / navigate to the project directory.
2. Run `npm install` to install the dependencies.
3. Run `npm start` to start the server.
4. Open your browser and navigate to `localhost:3000` to see the server in action!

You can change the port by updating `.env` file in the project directory, at the following line:
```yml
PORT=8080
```
This will change the port to 8080. You can change it to any port you like.

## Running the server in a container
1. Clone this repository, or download the source code as a zip file and extract it. Then, cd / navigate to the project directory.
2. Run `docker-compose up -d` and things should be up and running!

To change the port for the server, edit the `docker-compose.yml` file and change the port mapping for the `thumbnail-gen` service. For example, to change the port to 8080, change the following line:
```yml
# docker-compose.yml
...
expose:
      - '8080'
    ports:
      - '80:8080'

```
Or however you like it.

And remember to also update the port in the `.env` file in the project directory.
```yml
PORT=8080
```

</br>

# Contributing
Feel free to open an issue or submit a pull request! I am adding more functionality to this API as I feel like it, so any suggestions are welcome!