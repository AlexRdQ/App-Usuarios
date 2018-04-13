define(
  ['dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dojo/on',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidgetSetting',
    'esri/geometry/Extent',
    'jimu/dijit/ImageChooser',
    'jimu/dijit/ExtentChooser',
    'jimu/utils',
    "dojo/text!./Edit.html",
    'esri/tasks/PrintTemplate',
    'esri/tasks/PrintParameters',
    'esri/tasks/PrintTask',
    'dojo/Deferred',
    'jimu/portalUtils',
    'esri/request'
  ],
  function(
    declare,
    lang,
    html,
    on,
    _WidgetsInTemplateMixin,
    BaseWidgetSetting,
    Extent,
    ImageChooser,
    ExtentChooser,
    utils,
    template,
    PrintTemplate,
    PrintParameters,
    PrintTask,
    Deferred,
    portalUtils,
    esriRequest
    ){
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "eBookmark-Edit",
      templateString: template,
      extent:  {},
      portalUrl: null,
      itemId: null,
      ImageChooser: null,
      mapOptions: null,
      printServiceUrl: null,

      postCreate: function(){
        this.inherited(arguments);
        this.btnAddExtenTumbnailImg.src = this.folderUrl + 'images/map.png';
        this.imageChooser = new ImageChooser({
          cropImage: true,
          defaultSelfSrc: this.folderUrl + "images/thumbnail_default.png",
          showSelfImg: true,
          format: [ImageChooser.GIF, ImageChooser.JPEG, ImageChooser.PNG],
          goldenWidth: 100,
          goldenHeight: 60
        });
        this.own(on(this.name, 'Change', lang.hitch(this, '_onNameChange')));
        html.addClass(this.imageChooser.domNode, 'img-chooser');
        html.place(this.imageChooser.domNode, this.imageChooserBase, 'replace');
        this._getPrintTaskURL(this.portalUrl)
          .then(lang.hitch(this, function(printServiceUrl) {
            this.printServiceUrl = printServiceUrl;
          }));
      },

      setConfig: function(bookmark){
        var args = {
          portalUrl : this.portalUrl,
          itemId: this.itemId
        };
        if (bookmark.name){
          this.name.set('value', bookmark.name);
        }
        if (bookmark.thumbnail){
          var thumbnailValue = utils.processUrlInWidgetConfig(bookmark.thumbnail, this.folderUrl);
          this.imageChooser.setDefaultSelfSrc(thumbnailValue);
        }
        if (bookmark.extent){
          args.initExtent = new Extent(bookmark.extent);
        }
        if(this.mapOptions && this.mapOptions.lods){
          args.lods = this.mapOptions.lods;
        }
        this.extentChooser = new ExtentChooser(args, this.extentChooserNode);
        this.own(on(this.extentChooser, 'extentChange', lang.hitch(this, this._onExtentChange)));
        this.own(on(this.extentChooser, 'map-load', lang.hitch(this, function(){
          this.own(on.once(this.extentChooser.map, 'update-end', lang.hitch(this, this._onExtentMapLoad)));
        })));
      },

      getConfig: function(){
        var bookmark = {
          name: this.name.get("value"),
          extent: this.extentChooser.getExtent().toJson(),
          useradded: true,
          thumbnail: this.imageChooser.imageData
        };
        console.info(bookmark);
        return bookmark;
      },

      _onExtentMapLoad: function() {
        html.removeClass(this.btnAddExtenTumbnail, "disabled");
      },

      _getPrintTaskURL: function(portalUrl) {
        var printDef = new Deferred();
        if (this.config && this.config.serviceURL) {
          printDef.resolve(this.config.serviceURL);
          return printDef;
        }
        var def = portalUtils.getPortalSelfInfo(portalUrl);
        def.then(lang.hitch(this, function(response) {
          var printServiceUrl = response && response.helperServices &&
            response.helperServices.printTask && response.helperServices.printTask.url;
          if (printServiceUrl) {
            printDef.resolve(printServiceUrl);
          } else {
            printDef.reject('error');
          }
        }), lang.hitch(this, function(err) {
          new Message({
            message: this.nls.portalConnectionError
          });
          printDef.reject('error');
          console.error(err);
        }));

        return printDef;
      },

      onAddExtenTumbnailClick: function(){
        var oWid = this.extentChooser.map.width;
        var oHgt = this.extentChooser.map.height;
        var printTask = new PrintTask(this.printServiceUrl);
        var template = new PrintTemplate();
        template.exportOptions = {
          width: 500,
          height: 400,
          dpi: 200
        };
        template.format = "png32";
        template.layout = "MAP_ONLY";
        template.preserveScale = false;
        template.showAttribution = false;
        template.outScale = this.extentChooser.map.getScale();

        var params = new PrintParameters();
        params.map = this.extentChooser.map;
        params.template = template;
        printTask.execute(params, lang.hitch(this, this.printResult));
      },

      printResult: function(rsltURL){
        esriRequest({
          url: rsltURL.url,
          content: {f: "arraybuffer"},
          handleAs: "arraybuffer",
          callbackParamName: "callback"
        }).then(lang.hitch(this, function(response){
          var uInt8Array = new Uint8Array(response);
          var i = uInt8Array.length;
          var binaryString = new Array(i);
          while (i--)
          {
            binaryString[i] = String.fromCharCode(uInt8Array[i]);
          }
          var data = binaryString.join('');

          var base64 = window.btoa(data);
          this.imageChooser._cropImageByUser("data:image/png;base64," + base64);
        }));
      },

      _onNameChange: function(){
        this._checkRequiredField();
      },

      _onExtentChange: function(extent){
        this.currentExtent = extent;
      },

      _checkRequiredField: function(){
        if (!this.name.get('value')){
          if (this.popup){
            this.popup.disableButton(0);
          }
        }else{
          if (this.popup){
            this.popup.enableButton(0);
          }
        }
      }
    });
  });
