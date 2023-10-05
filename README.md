# Basic Thumbnail Generator API
A super simple API to generate image placeholders of any color and size, as well as "thumbnails" with text overlay.

**Demo webpage:** https://imagen.cnp.is/

</br>

# Table of Contents
1. [Endpoints](#endpoints)
    - [`/color`](#get-color)
    - [`/thumbnail`](#get-thumbnail)

2. [Code Example](#code-example)
3. [Setup](#running-the-server)
    - [Prerequisites](#prerequisites)
    - [Run with Node.js](#run-with-nodejs)
    - [Run the server in a Docker container](#running-the-server-in-a-container)

# Endpoints
**Assuming the server is running on `localhost:3000`, the following endpoints are available:**

## GET `/color`
![color-endpoint-demo](demo/61B8E1@1200x220.png)
Generates a placeholder image of a given color and size.

***Response type***: arrayBuffer

### Parameters:
#### **`color`** *(optional)*
The color and size option of the image. The parameter value is in this format:

**`fullsize hexcode` `alpha as hexadecimal`@`width`x`height`**

Each part of the request is optional, with the following *defaults*:
- `fullsize hexcode`: Randomized
- `alpha as hexadecimal`: `ff` (100%, no transparency)
- `width`x`height`: `1200x630` px
- If either `width` or `height` is omitted, the image is a square with the specified dimension

#### **`svg`** *(optional)*
If this parameter is present (the value is `true`), the server will return an SVG image instead of a PNG image.

*Default:* `false`

#### **`preview`** *(optional)*
Applicable only when `svg` is `true`. If this parameter is present (the value is `true`/`preview`), the server will return an HTML page with the SVG image embedded. Otherwise, the server will return the SVG image directly.

*Default:* `true`

### Short-hand route: `/color/:options?/:svg?/:preview?`
The above dynamic route can be used in place of the `/color` endpoint params. When using short-hand route, the order of the params are significant.

### Examples:
- `http://localhost:3000/color/ff0000` - A red square with 1200x630 px sides
- `http://localhost:3000/color/0080ff80@1920x1080` - A light blue rectangle with 1920x1080 px sides and 50% opacity
- `http://localhost:3000/color/@640x960/svg/nopreview` - A random color rectangle with 640x960 px sides, in SVG format, with no preview HTML.

- `http://localhost:3000/color/?svg=true&preview=false` - A random color square with 1200x630 px sides, in SVG format, with no preview HTML.

</br>


## GET `/thumbnail`
![thumbnail-endpoint-demo](demo/7D4340@1200x220.png)
Generates a placeholder image of a given size, with a text overlay.

***Response type***: arrayBuffer

### Parameters:

#### **`description`** *(optional)*
The text string to be displayed on the image. Except for the `whitespace` character, you might need to convert special characters to their corresponding HTML entities/escape sequences. For example, `#` should be converted to `%23`. See [this page](https://www.w3schools.com/tags/ref_urlencode.ASP) for a list of HTML entities. Many characters are not supported, though, so you might need to experiment a bit.
*Also, the `description` length is limited to 25 words.*

*Default:* Ramdomized string `[A-Z][a-z][0-9][-_]`

#### **`background`** *(optional)*
Behaves the same as the `color` parameter of the [`/color` endpoint](#color). All of the omitting rules apply here as well!

*Default:* `@1200x630`

#### **`svg`** *(optional)*
If this parameter is present (the value is `true`), the server will return an SVG image instead of a PNG image.

*Default:* `false`

#### **`preview`** *(optional)*
Applicable only when `svg` is `true`. If this parameter is present (the value is `true`/`preview`), the server will return an HTML page with the SVG image embedded. Otherwise, the server will return the SVG image directly.

Since the app uses a custom font, using the preview HTML will render the image preview correctly. The SVG image itself does not contain the font to reduce the file transfer size. If you want to use the SVG image directly in your app, you will need to download the font and embed it in the SVG image yourself.

*Default:* `true`

### Short-hand route: `/thumbnail/:description?/:background?/:svg?/:preview?`
The above dynamic route can be used in place of the `/thumbnail` endpoint params. When using short-hand route, the order of the params are significant.

### Examples:
- `http://localhost:3000/thumbnail/Hello World` - A random color square with 1200x630 px sides, with the text "Hello World" in the center.
- `http://localhost:3000/thumbnail/Hello World/@1920x1080` - A random color rectangle with 1920x1080 px sides, with the text "Hello World" in the center.
- `http://localhost:3000/thumbnail/Hello World/@1920x1080/svg/nopreview` - A random color rectangle with 1920x1080 px sides, with the text "Hello World" in the center, in SVG format, with no preview HTML.

- `http://localhost:3000/thumbnail/?svg=true&preview=false` - A random color square with 1200x630 px sides, with the text "Hello World" in the center, in SVG format, with no preview HTML.
- `http://localhost:3000/thumbnail/?background=@1920x1080` - A random color rectangle with 1920x1080 px sides, with the text "Hello World" in the center.

</br>


## `/`
The root of the server. This return a random **thumbnail** of size `1920x1080` px.

</br>

# Code Example

### Random thumbnail text with image size `1920x1080` px

**JavaScript**
```javascript
async function randomThumbnail(width, height) {
    const result = await fetch(
        `http://localhost:3000/thumbnail/?background=@${width}x${height}`
    ).catch(err => { console.error(err) }
    );
    
    // convert the result png buffer to a base64 string
    const imageBase64 = btoa(
        new Uint8Array(await result.arrayBuffer())
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // save the image to a file
    const fs = require('fs'); // should move this to the top of the file in practice
    fs.writeFileSync('random-thumbnail.png', imageBase64, 'base64', function(err) {
        console.error(err);
    });

    // make into a data URI (try copy and paste the result into your browser!)
    const dataURI = `data:image/png;base64,${imageBase64}`;
    console.log(dataURI); // data:image/png;base64,iVBORw0KGgoAAAAN...
}

randomThumbnail(1920, 1080);
```
![random-thumbnail.png](demo/06916E@1920x1080.png)

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