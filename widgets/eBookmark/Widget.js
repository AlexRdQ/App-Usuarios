///////////////////////////////////////////////////////////////////////////
// Robert Scheitlin WAB eBookmark Widget
///////////////////////////////////////////////////////////////////////////
/*global define*/
define([
  'dojo/_base/declare',
  'jimu/BaseWidget',
  'jimu/dijit/Message',
  'jimu/dijit/Popup',
  'dojo/keys',
  'dojo/on',
  'dojo/_base/lang',
  './BookmarkListView',
  'libs/storejs/store',
  'dojo/_base/array',
  'dojo/_base/html',
  'dojo/dom-construct',
  'dojo/string',
  'dojo/query',
  'dojo/dom-style',
  'esri/geometry/Extent',
  'jimu/utils',
  './BaseWidgetAction',
  './ActionPopupMenu',
  './AddBookmark',
  './AddFolder',
  './UploadBookmarks',
  'dojo/json',
  'esri/urlUtils'
],
function(
  declare,
  BaseWidget,
  Message,
  Popup,
  keys,
  on,
  lang,
  BookmarkListView,
  store,
  array,
  html,
  domConstruct,
  string,
  query,
  domStyle,
  Extent,
  utils,
  BaseWidgetAction,
  ActionPopupMenu,
  AddBookmark,
  AddFolder,
  UploadBookmarks,
  JSON,
  urlUtils
  ) {
  return declare([BaseWidget], {

    baseClass: 'enhanced-bookmark-widget',
    name: 'eBookmark',
    bookmarks: [],
    currentBookmark: null,
    currentBookmarkParent: null,
    bookmarkNameExists: false,
    popup: null,
    popup2: null,
    popupMenu: null,
    textFile: null,

    postCreate: function(){
      this.inherited(arguments);
      this.popupMenu = ActionPopupMenu.getInstance();
      this.own(on(this.domNode, 'mousedown', lang.hitch(this, function (event) {
        event.stopPropagation();
        if (event.altKey) {
          var msgStr = this.nls.widgetverstr + ': ' + this.manifest.version;
          msgStr += '\n' + this.nls.wabversionmsg + ': ' + this.manifest.wabVersion;
          msgStr += '\n' + this.manifest.description;
          new Message({
            titleLabel: this.nls.widgetversion,
            message: msgStr
          });
        }
      })));
    },

    startup: function() {
      this.inherited(arguments);
    },

    onOpen: function(){
      // summary:
      //    see description in the BaseWidget
      // description:
      //    this function will check local cache first. If there is local cache,
      //    use the local cache, or use the bookmarks configured in the config.json
      var localBks = this._getLocalCache();
      if(localBks.length > 0){
        this.bookmarks = localBks;
      }else{
        this.bookmarks = lang.clone(this.config.bookmarks);
      }
      this.showBookmarks();
    },

    onClose: function(){
      this.bookmarks = [];
      this.currentBookmark = null;
    },

    onMinimize: function(){
      this.resize();
    },

    onMaximize: function(){
      this.resize();
    },

    showBookmarks: function() {
      //remove the webmap bookmarks so that the webmap bookmarks are always last
      this.bookmarks = array.filter(this.bookmarks, lang.hitch(this, function (bookmark) {
                return !bookmark.isInWebmap;
              }));
      //Add back the webmap bookmarks
      this._readBookmarksInWebmap();

      domConstruct.empty(this.bookmarkListBody);
      // summary:
      //    create a BookmarkListView module used to draw bookmark list in browser.
      this.bookmarkListView = new BookmarkListView({
        mybookmarkarray: this.bookmarks,
        eBookmarkWidget: this,
        config: this.config,
        map: this.map,
        nls: this.nls
      }).placeAt(this.bookmarkListBody);

      this.resize();
      this.own(this.bookmarkListView.on(
                  'onRowClick',
                  lang.hitch(this, this._onBookmarkListViewRowClick)));
      this.own(this.bookmarkListView.on(
                  'onRowDeleteClick',
                  lang.hitch(this, this._onDeleteBtnClicked)));
      this.own(this.bookmarkListView.on(
                  'onThumbClick',
                  lang.hitch(this, this._onThumbClickHandler)));
    },

    _onThumbClickHandler: function(bookmarkTrNode, bookmark){
      this.popup = new Popup({
        titleLabel: this.nls.bookmarkPreview,
        autoHeight: true,
        content: "<img src='" + utils.processUrlInWidgetConfig(bookmark.thumbnail, this.folderUrl) + "' alt='"+ this.nls.bookmarkThumbnail +"'/>",
        container: 'main-page',
        width: 400,
        onClose: lang.hitch(this, '_onThumbPreviewClose')
      });
    },

    _onThumbPreviewClose: function() {
      this.popup = null;
    },

    _onBookmarkListViewRowClick: function(bookmarkTrNode, bookmark, deleteImg, loadingImg, parent){
      this.currentBookmark = bookmark;
      this.currentBookmarkParent = parent;
      this.ClearSelectionEnabled = true;
      if(!bookmark.items) {
        domStyle.set(loadingImg, 'display', '');
        if(deleteImg){
          domStyle.set(deleteImg, 'display', 'none');
        }
        var nExtent = Extent(bookmark.extent);
        var mevent;
        this.own(mevent = on(this.map, 'update-end', lang.hitch(this, function(){
          if(loadingImg){
            domStyle.set(loadingImg, 'display', 'none');
            if(deleteImg){
              domStyle.set(deleteImg, 'display', '');
            }
            mevent.remove();
          }
        })));
        this.map.setExtent(nExtent);
      }
    },

    _onBookmarkListViewRowClear: function(){
      this.bookmarkListView.clearSelected();
      this.currentBookmark = null;
      this.ClearSelectionEnabled = false
    },

    _createBookmark: function(bmName){
      var b = {
        name: bmName,
        extent: this.map.extent.toJson()
      };
      b.useradded = true;
      // console.info(this.currentBookmark, this.currentBookmarkParent);
      if(this.currentBookmark){
        if(!this.currentBookmark.items){
          if(!this.currentBookmarkParent.items){
            this.bookmarks.push(b);
          }else{
            this.currentBookmarkParent.items.push(b);
          }
        }else{
          this.currentBookmark.items.push(b);
        }
      }else{
        this.bookmarks.push(b);
      }
      this._saveAllToLocalCache();
      this.resize();
    },

    _createFolder: function(fObject){
      // console.info(this.currentBookmark, this.currentBookmarkParent);
      if(this.currentBookmark){
        if(!this.currentBookmark.items){
          if(!this.currentBookmarkParent.items){
            this.bookmarks.push(fObject);
          }else{
            this.currentBookmarkParent.items.push(fObject);
          }
        }else{
          this.currentBookmark.items.push(fObject);
        }
      }else{
        this.bookmarks.push(fObject);
      }
      this._saveAllToLocalCache();
      this.resize();
    },

    _onAddFolderMenuItemClicked: function() {
      if(this.currentBookmark && this.currentBookmark.isInWebmap){
        new Message({
          titleLabel: this.nls.webmapfoldername,
          message: this.nls.errorWebmapNode
        });
        return;
      }
      this.AddFolderPopup = new AddFolder({
        nls: this.nls,
        config: {},
        bookmarks: this.bookmarks,
        currentBookmark: this.currentBookmark,
        currentBookmarkParent: this.currentBookmarkParent
      });
      this.popup = new Popup({
        titleLabel: this.nls.addFolder,
        autoHeight: true,
        content: this.AddFolderPopup,
        container: 'main-page',
        width: 400,
        buttons: [{
          label: this.nls.add,
          key: keys.ENTER,
          onClick: lang.hitch(this, '_onAddFolderPopupOk')
        }, {
          label: this.nls.cancel,
          key: keys.ESCAPE
        }],
        onClose: lang.hitch(this, '_onAddFolderPopupClose')
      });
      this.popup.disableButton(0);
    },

    _onAddBookmarkMenuItemClicked: function() {
      if(this.currentBookmark && this.currentBookmark.isInWebmap){
        new Message({
          titleLabel: this.nls.webmapfoldername,
          message: this.nls.errorWebmapNode
        });
        return;
      }
      this.AddBookmarkPopup = new AddBookmark({
        nls: this.nls,
        config: {},
        bookmarks: this.bookmarks,
        currentBookmark: this.currentBookmark,
        currentBookmarkParent: this.currentBookmarkParent
      });
      this.popup = new Popup({
        titleLabel: this.nls.addBookmark,
        autoHeight: true,
        content: this.AddBookmarkPopup,
        container: 'main-page',
        width: 400,
        buttons: [{
          label: this.nls.add,
          key: keys.ENTER,
          onClick: lang.hitch(this, '_onAddBookmarkPopupOk')
        }, {
          label: this.nls.cancel,
          key: keys.ESCAPE
        }],
        onClose: lang.hitch(this, '_onAddBookmarkPopupClose')
      });
      this.popup.disableButton(0);
    },

    _onAddBookmarkPopupClose: function() {
      this.AddBookmarkPopup = null;
      this.popup = null;
    },

    _onAddBookmarkPopupOk: function() {
      var bmName = this.AddBookmarkPopup.getConfig().name;
      this.popup.close();
      this._createBookmark(bmName);
      this._onBookmarkListViewRowClear();
      this.showBookmarks();
    },

    _onAddFolderPopupOk: function() {
      var folder = this.AddFolderPopup.getConfig();
      this.popup.close();
      this._createFolder(folder);
      this._onBookmarkListViewRowClear();
      this.showBookmarks();
    },

    _onAddFolderPopupClose: function() {
      this.AddFolderPopup = null;
      this.popup = null;
    },

    _onDeleteBtnClicked: function(bookmark, bookmarkTrNode, parent){
      var bmArray = (parent.hasOwnProperty('items')) ? parent.items : this.bookmarks;
      array.some(bmArray, function(b, i){
        // jshint unused:false
        if(b.name === bookmark.name){
          bmArray.splice(i, 1);
          return true;
        }
      }, this);

      this._saveAllToLocalCache();
      this.resize();

      this.currentBookmark = null;
      this.showBookmarks();
      this._onBookmarkListViewRowClear();
    },

    _saveAllToLocalCache: function() {
      // summary:
      //    if user add/delete a bookmark, we will save all of the bookmarks into the local storage.

      var keys = [];
      //clear
      array.forEach(store.get(this.name), function(bName){
        store.remove(bName);
      }, this);

      array.forEach(this.bookmarks, function(bookmark){
        if(bookmark.isInWebmap){
          return;
        }
        var key = this.name + '.' + bookmark.name;
        keys.push(key);
        store.set(key, bookmark);
      }, this);

      store.set(this.name, keys);
    },

    resize: function(){
      var box = html.getMarginBox(this.domNode);
      var listHeight = box.h - 50;

      //fix for IE8
      if(listHeight < 0){
        listHeight = 0;
      }
      html.setStyle(this.bookmarkListBody, 'height', listHeight + 'px');
    },

    _getLocalCache: function() {
      var ret = [];
      if(!store.get(this.name)){
        return ret;
      }
      array.forEach(store.get(this.name), function(bName){
        if(bName.startWith(this.name)){
          ret.push(store.get(bName));
        }
      }, this);
      return ret;
    },

    _onLoadBtnClicked: function() {
      this.UploadBookmarksPopup = new UploadBookmarks({
        nls: this.nls,
        config: {}
      });
      this.UploadBookmarksPopup.startup();
      this.popup = new Popup({
        titleLabel: this.nls.loadBookmarks,
        autoHeight: true,
        content: this.UploadBookmarksPopup,
        container: 'main-page',
        width: 400,
        buttons: [{
          label: this.nls.ok,
          key: keys.ENTER,
          onClick: lang.hitch(this, '_onUploadBookmarksPopupOk')
        }, {
          label: this.nls.cancel,
          key: keys.ESCAPE
        }],
        onClose: lang.hitch(this, '_onUploadBookmarksPopupClose')
      });
      this.popup.disableButton(0);
    },

    _onUploadBookmarksPopupOk: function() {
      var data = this.UploadBookmarksPopup.getConfig();
      this.popup.close();
      this.bookmarks = JSON.parse(data.data);
      this._saveAllToLocalCache();
      this.resize();
      this._onBookmarkListViewRowClear();
      this.showBookmarks();
    },

    _onUploadBookmarksPopupClose: function() {
      this.UploadBookmarksPopup = null;
      this.popup = null;
    },

    _onSaveBtnClicked: function() {
      var link = document.createElement('a');
      link.setAttribute('download', 'bookmarks.json');
      JSON.stringify
      link.href = this._makeJsonFile(JSON.stringify(this.bookmarks));
      document.body.appendChild(link);

      // wait for the link to be added to the document
      window.requestAnimationFrame(function () {
        var event = new MouseEvent('click');
        link.dispatchEvent(event);
        document.body.removeChild(link);
  		});
    },

    _makeJsonFile: function(text) {
      var data = new Blob([text], {type: 'application/json'});

      // If we are replacing a previously generated file we need to
      // manually revoke the object URL to avoid memory leaks.
      if (this.textFile !== null) {
        window.URL.revokeObjectURL(this.textFile);
      }

      this.textFile = window.URL.createObjectURL(data);

      return this.textFile;
    },

    _readBookmarksInWebmap: function(){
      if(!this.map.itemInfo || !this.map.itemInfo.itemData ||
        !this.map.itemInfo.itemData.bookmarks){
        return;
      }
      var webmapBookmarks = [];
      array.forEach(this.map.itemInfo.itemData.bookmarks, function(bookmark){
        bookmark.isInWebmap = true;
        bookmark.name = bookmark.name;
        var repeat = 0;
        for (var i = 0; i <this.bookmarks.length; i++ ){
          if (this.bookmarks[i].name === bookmark.name){
            repeat ++;
          }
        }
        if (!repeat){
          webmapBookmarks.push(bookmark);
        }
      }, this);

      var webmapFolder = {
        "name": this.nls.webmapfoldername,
        "items": webmapBookmarks,
        "expanded": true,
        "isInWebmap": true
      };
      this.bookmarks.push(webmapFolder);
    },

    getBookmarkExtent: function(bookmark) {
      var accuracy = 1E4;
      var extent = bookmark.extent;
      return null !== extent ? this._roundValue(extent.xmin, accuracy) + "," +
      this._roundValue(extent.ymin, accuracy) + "," + this._roundValue(extent.xmax, accuracy) + "," +
      this._roundValue(extent.ymax, accuracy) + "," + extent.spatialReference.wkid : "";
    },

    _roundValue: function(a, b) {
      return Math.round(a * b) / b;
    },

    exportURL: function () {
      var useSeparator, extentStr;
      extentStr = this.getBookmarkExtent(this.currentBookmark);
      var url = window.location.protocol + '//' + window.location.host + window.location.pathname;
      var urlObject = urlUtils.urlToObject(window.location.href);
      urlObject.query = urlObject.query || {};
      urlObject.query.extent = extentStr;
      // each param
      for (var i in urlObject.query) {
        if (urlObject.query[i] && urlObject.query[i] !== 'config') {
          // use separator
          if (useSeparator) {
            url += '&';
          } else {
            url += '?';
            useSeparator = true;
          }
          url += i + '=' + urlObject.query[i];
        }
      }
      window.prompt(this.nls.copyurlprompt, url);
    },

    _onBtnMenuClicked: function(evt){
      var actions = []
      var position = html.position(evt.target || evt.srcElement);

      if(this.config.addbookmarks){
        var AddBookmarkAction = new BaseWidgetAction({
          name: "AddBookmark",
          iconClass: 'icon-add',
          label: this.nls.addBookmark,
          iconFormat: 'svg',
          map: this.map,
          onExecute: lang.hitch(this, this._onAddBookmarkMenuItemClicked)
        });
        AddBookmarkAction.name = "AddBookmark";
        AddBookmarkAction.data = null;
        actions.push(AddBookmarkAction);

        var AddFolderAction = new BaseWidgetAction({
          name: "AddFolder",
          iconClass: 'icon-add',
          label: this.nls.addFolder,
          iconFormat: 'svg',
          map: this.map,
          onExecute: lang.hitch(this, this._onAddFolderMenuItemClicked)
        });
        AddFolderAction.name = "AddFolder";
        AddFolderAction.data = null;
        actions.push(AddFolderAction);
      }

      var SaveBookmarksAction = new BaseWidgetAction({
        name: "SaveBookmarks",
        iconClass: 'icon-save',
        label: this.nls.saveBookmarks,
        iconFormat: 'svg',
        map: this.map,
        onExecute: lang.hitch(this, this._onSaveBtnClicked)
      });
      SaveBookmarksAction.name = "SaveBookmarks";
      SaveBookmarksAction.data = null;
      actions.push(SaveBookmarksAction);

      var LoadBookmarksAction = new BaseWidgetAction({
        name: "LoadBookmarks",
        iconClass: 'icon-launch',
        label: this.nls.loadBookmarks,
        iconFormat: 'svg',
        map: this.map,
        onExecute: lang.hitch(this, this._onLoadBtnClicked)
      });
      LoadBookmarksAction.name = "LoadBookmarks";
      LoadBookmarksAction.data = null;
      actions.push(LoadBookmarksAction);

      if(this.currentBookmark && this.currentBookmark.extent){
        var BookmarkUriAction = new BaseWidgetAction({
          name: "BookmarkUri",
          iconClass: 'icon-export',
          label: this.nls.exportBookmarkUri,
          iconFormat: 'svg',
          map: this.map,
          onExecute: lang.hitch(this, this.exportURL)
        });
        BookmarkUriAction.name = "BookmarkUri";
        BookmarkUriAction.data = null;
        actions.push(BookmarkUriAction);
      }

      if(this.ClearSelectionEnabled){
        var ClearSelectionAction = new BaseWidgetAction({
          name: "ClearSelection",
          iconClass: 'icon-close',
          label: this.nls.clearSelected,
          iconFormat: 'svg',
          map: this.map,
          onExecute: lang.hitch(this, this._onBookmarkListViewRowClear)
        });
        ClearSelectionAction.name = "ClearSelection";
        ClearSelectionAction.data = null;
        actions.push(ClearSelectionAction);
      }

      this.popupMenu.setActions(actions);
      this.popupMenu.show(position);
    }

  });
});
