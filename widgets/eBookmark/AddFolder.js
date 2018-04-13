///////////////////////////////////////////////////////////////////////////
// Robert Scheitlin WAB eBookmark Widget
///////////////////////////////////////////////////////////////////////////
/*global define*/
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
    "dojo/text!./AddFolder.html",
    "dijit/form/ValidationTextBox",
    "jimu/dijit/CheckBox"
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
    template
    ){
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "add-folder-popup",
      templateString: template,
      bookmarks: null,
      config: null,
      nls: null,
      bookmarkNameExists: false,
      currentBookmark: null,
      currentBookmarkParent: null,

      postCreate: function(){
        this.inherited(arguments);
        this.own(on(this.folderName, 'Change', lang.hitch(this, this._onNameChange)));
        this.own(on(this.folderName, 'keydown', lang.hitch(this, function(evt){
          var keyNum = evt.keyCode !== undefined ? evt.keyCode : evt.which;
          if(html.getStyle(this.errorNode, 'display') === 'block'){
            html.setStyle(this.errorNode, {display: 'none'});
            this.errorNode.innerHTML = '&nbsp;';
          }
          if (keyNum === 13) {
            this._onNameChange();
          }
        })));
      },

      startup: function() {
        this.inherited(arguments);
        this.popup.disableButton(0);
      },

      setConfig: function(){
        this.config = config;
        if(!this.config){
          return;
        }
      },

      getConfig: function(){
        var config = {
          name: this.folderName.value,
          items: [],
          expanded: this.expandedCbx.getValue(),
          useradded: true
        };

        this.config = config;
        return this.config;
      },

      _onNameChange: function(){
        this._checkRequiredField();
      },

      _checkRequiredField: function(){
        this.bookmarkNameExists = false;
        if (string.trim(this.folderName.value).length === 0) {
          html.setStyle(this.errorNode, {display: 'block'});
          this.errorNode.innerHTML = this.nls.errorNameNull;
          if (this.popup){
            this.popup.disableButton(0);
          }
          return;
        }
        array.some(this.bookmarks, lang.hitch(this, function(b, index){
          this._searchBookmarksForExistingName(b, index, this.folderName.value);
        }));

        if(this.bookmarkNameExists === true){
          html.setStyle(this.errorNode, {display: 'block'});
          this.errorNode.innerHTML = this.nls.errorNameExist;
          if (this.popup){
            this.popup.disableButton(0);
          }
          return;
        }

        html.setStyle(this.errorNode, {display: 'none'});
        this.errorNode.innerHTML = '&nbsp;';
        if (this.popup){
          this.popup.enableButton(0);
        }
      },

      _searchBookmarksForExistingName: function (bookmark, index, name) {
        if(bookmark.name === name){
          this.bookmarkNameExists = true;
          return true;
        }

        if(bookmark.items) {
          array.some(bookmark.items, lang.hitch(this ,function(subBookmark){
            this._searchBookmarksForExistingName(subBookmark, index, name);
          }));
        }
      }
    });
  });
