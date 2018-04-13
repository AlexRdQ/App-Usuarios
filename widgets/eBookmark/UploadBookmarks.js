///////////////////////////////////////////////////////////////////////////
// Robert Scheitlin WAB eBookmark Widget
///////////////////////////////////////////////////////////////////////////
/*global define, FileReader, setInterval, clearInterval, window, ActiveXObject, document, navigator*/
define(
  ["dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    'dojo/_base/html',
    "dojo/on",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/query",
    "dojo/string",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/registry",
    "jimu/BaseWidgetSetting",
    "jimu/dijit/Message",
    "dojo/text!./UploadBookmarks.html",
    "dojo/sniff",
    "jimu/utils",
    "jimu/tokenUtils"
  ],
  function(
    declare,
    lang,
    array,
    html,
    on,
    domStyle,
    domAttr,
    query,
    string,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    registry,
    BaseWidgetSetting,
    Message,
    template,
    has,
    utils,
    tokenUtils
    ){
      /*global testLoad*/
      var fileAPIJsStatus = 'unload'; // unload, loading, loaded

      function _loadFileAPIJs(prePath, cb) {
        prePath = prePath || "";
        var loaded = 0,
          completeCb = function() {
            loaded++;
            if (loaded === tests.length) {
              cb();
            }
          },
          tests = [{
            test: window.File && window.FileReader && window.FileList && window.Blob ||
              !utils.file.isEnabledFlash(),
            failure: [
              prePath + "libs/polyfills/fileAPI/FileAPI.js"
            ],
            callback: function() {
              completeCb();
            }
          }];

        for (var i = 0; i < tests.length; i++) {
          testLoad(tests[i]);
        }
      }
    var clazz = declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "add-bookmark-popup",
      templateString: template,
      bookmarks: null,
      config: null,
      nls: null,
      bookmarkNameExists: false,
      currentBookmark: null,
      currentBookmarkParent: null,
      jsonFileData: null,

      postCreate: function(){
        this.inherited(arguments);
        if (!utils.file.supportHTML5() && !has('safari') && utils.file.isEnabledFlash()) {
          if (fileAPIJsStatus === 'unload') {
            var prePath = tokenUtils.isInBuilderWindow() ? 'stemapp/' : "";
            window.FileAPI = {
              debug: false,
              flash: true,
              staticPath: prePath + 'libs/polyfills/fileAPI/',
              flashUrl: prePath + 'libs/polyfills/fileAPI/FileAPI.flash.swf',
              flashImageUrl: prePath + 'libs/polyfills/fileAPI/FileAPI.flash.image.swf'
            };

            _loadFileAPIJs(prePath, lang.hitch(this, function() {
              //html.setStyle(this.mask, 'zIndex', 1); // prevent mask hide file input
              fileAPIJsStatus = 'loaded';
            }));
            fileAPIJsStatus = 'loading';
          } else {
            //html.setStyle(this.mask, 'zIndex', 1); // prevent mask hide file input
          }
        }
      },

      startup: function() {
        this.inherited(arguments);
        this.own(on(this.fileInput, "change", lang.hitch(this, function (evt) {
          var maxSize = has('ie') < 9 ? 23552 : 1048576; //ie8:21k others:1M
          //console.info(evt);
          this.readFile(evt, 'json', maxSize,
            lang.hitch(this, function (err, fileName, fileData) {
            /*jshint unused: false*/
            if (err) {
              console.info(err);
              var message = this.nls[err.errCode];
              if (err.errCode === 'exceed') {
                message = message.replace('1024', maxSize / 1024);
              }
              new Message({'message': message});
            } else {
              this.jsonFileData = fileData;
              this.popup.enableButton(0);
            }
          }));
        })));
      },

      setConfig: function(){
        this.config = config;
        if(!this.config){
          return;
        }
      },

      getConfig: function(){
        var config = {
          data: this.jsonFileData
        };

        this.config = config;
        return this.config;
      },

      readFile: function(fileEvt, filter, maxSize, cb) {
        if (this.supportHTML5()) {
          var file = fileEvt.target.files[0];
          if (!file) {
            return;
          }
          // Only process json files.
          if (file.type && !file.type.match(filter)) {
            // cb("Invalid file type.");
            cb({
              errCode: "invalidType"
            });
            return;
          }

          if (file.size >= maxSize) {
            // cb("File size cannot exceed  " + Math.floor(maxSize / 1024) + "KB.");
            cb({
              errCode: "exceed"
            });
            return;
          }

          var reader = new FileReader();
          // Closure to capture the file information.
          reader.onload = function(e) {
            cb(null, file.name, e.target.result);
          };
          // Read in the json file as a data URL.
          reader.readAsText(file);
        } else if (this.supportFileAPI()) {
          var files = window.FileAPI.getFiles(fileEvt);
          // Only process json files.
          if (files[0].type && !files[0].type.match(filter)) {
            // cb("Invalid file type.");
            cb({
              errCode: "invalidType"
            });
            return;
          }

          if (files[0].size >= maxSize) {
            // cb("File size cannot exceed  " + Math.floor(maxSize / 1048576) + "M.");
            cb({
              errCode: "exceed"
            });
            return;
          }
          window.FileAPI.debug = true;
          window.FileAPI.readAsText(files[0], "utf-8", function(evt) {
            //console.info(evt);
            if (evt && evt.result) {
              cb(null, files[0].name, evt.result);
            } else {
              cb({
                errCode: "readError"
              });
            }
          });
        }
      },

      supportHTML5: function() {
        if (window.File && window.FileReader && window.FileList && window.Blob) {
          return true;
        } else {
          return false;
        }
      },

      supportFileAPI: function() {
        if (has('safari') && has('safari') < 6) {
          return false;
        }
        if (window.FileAPI && window.FileAPI.readAsDataURL) {
          return true;
        }
        return false;
      },

      isEnabledFlash: function(){
        var swf = null;
        if (document.all) {
          try{
            swf = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
          }catch(e) {
            swf = null;
          }
        } else {
          if (navigator.plugins && navigator.plugins.length > 0) {
            swf = navigator.plugins["Shockwave Flash"];
          }
        }
        return !!swf;
      },
    });
    return clazz;
  });
