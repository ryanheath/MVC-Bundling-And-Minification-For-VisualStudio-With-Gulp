# MVC Bundling And Minification For VisualStudio With Gulp

As Microsoft is moving forward into crossplatform support of ASP.NET, it felt the need to stop supporting the mvc bundling and minification solution that comes with ASP.NET.
Inspired by an [article of Frederik Normén], I decided to bite the bullet and created a solution with gulp that more or less mimics the same developer experience we have with the mvc bundling and minification.

## Example project
I have added an example mvc website project that is converted from the mvc bundling to the gulp bundling.

There are five files of interest:
- App_Start/bundles_css.json
  > This file will contain all your css bundled files as you had configured formerly in BundleConfig.cs
- App_Start/bundles_js.json
  > This file will contain all your js bundled files as you had configured formerly in BundleConfig.cs
- gulp.js
  > The code where it all happens ...
- package.json
  > Registers all needed node libraries for gulp.js
- bower.json
  > Registers all needed javascript libraries for your application
 
## Example bundles_css.json
```json
{
    "bundles": {
        "bootstrap.css": {
            "sources": [
                "./bower_components/bootstrap/dist/css/bootstrap.css",
                "./Content/Site.css"
            ]
        }
    }
}
```
Here we define a bundle named 'bootstrap.css' that contain the bootstrap.css provided by bower and the application's site.css.

## Example bundles_js.json
```json
{
    "bundles": {
        "jquery.js": {
            "sources": [
                "./bower_components/jquery/dist/jquery.js",
                "./bower_components/jquery.validate/dist/jquery.validate.js",
                "./Scripts/jquery.validate.unobtrusive.js"
            ]
        },
        "bootstrap.js": {
            "sources": [
                "./bower_components/bootstrap/dist/js/bootstrap.js",
                "./bower_components/respond/dest/respond.src.js"
            ]
        },
        "modernizr.js": {
            "sources": [
                "./bower_components/modernizr/modernizr.js"
            ]
        }
    }
}
```
Here we define three bundles named 'jquery.js', 'bootstrap.js' & 'modernizr.js'.

## Generated Views
The gulp file will generate shared views per bundle that contains the js/css files and their bundled & minified version. In debug mode the unbundled & unminified sources are used, in release mode the bundled and minified version is used.

```c#
@{
    var root = "";
    if (ViewBag.BundlesUseAbsolutePath == true) {
        root = HttpContext.Current.Request.Url.Scheme + "://" + HttpContext.Current.Request.Url.Authority;
    }
}
@if (HttpContext.Current.IsDebuggingEnabled) {
<link rel="stylesheet" type="text/css" href="@root/bower_components/bootstrap/dist/css/bootstrap.css">
<link rel="stylesheet" type="text/css" href="@root/Content/Site.css">
} else {
<link rel="stylesheet" type="text/css" href="@root/static_b/css/bootstrap-49344a1e81.min.css">
}
```
Above an example of the bootstrap.js bundle is displayed. If for some reason you need absolute urls to the includes, you can set the ViewBag.BundlesUseAbsolutePath to true.

## Usage in views
Instead of calling the MVC Bundle:
```c#
@Scripts.Render("~/bundles/modernizr")
```
you should call the generated view:
```c#
@Html.Partial("~/Views/Shared/Bundles/modernizr.js.bundle.cshtml")
```

And style bundles as well
```c#
@Styles.Render("~/Content/css")
```
replace with
```c#
@Html.Partial("~/Views/Shared/Bundles/bootstrap.css.bundle.cshtml")
```

I recommend to use [T4MVC] to avoid usage of hardcoded strings in your views. I left it out of the example to keep things clean.

## Less to css
The gulp file contains a task which will listen for changes in less files and converts them to css files.

## Settings
The gulp file contains a paths object that can be altered when you want the generated files places elsewhere.
```javascript
var paths = {
    app: "./Content/",
    bundle_source: "./App_Start/",
    bundle_target: "./static_b/",
    bundle_views_target: "./Views/Shared/Bundles/"
}
```
- app: this directory used to listen for less files.
- bundle_source: this directory points to where the bundle configuration json files should be found.
- bundle_target: in this directory the bundled and minified files will be placed.
- bundle_views_target: in the directory the generated views will be placed.

## License
MIT

[//]: # (These are reference links used in the body of this note and get stripped out when the markdown processor does it's job. There is no need to format nicely because it shouldn't be seen. Thanks SO - http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax)

   [article of Frederik Normén]: <https://weblogs.asp.net/fredriknormen/setting-up-gulp-and-bower-for-a-asp-net-mvc-project-in-visual-studio-2013>
   [T4MVC]: <https://github.com/T4MVC/T4MVC>
