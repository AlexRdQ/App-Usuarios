define(['dojo/_base/declare',
    'jimu/PoolControllerMixin',
    'dojo/on', 'dojo/query', 'dojo/dom-class',
    'jimu/BaseWidget'
  ],
  function(declare, PoolControllerMixin, on, query, domClass, BaseWidget) {
    return declare([BaseWidget, PoolControllerMixin], {

      baseClass: 'jimu-widget-sidebar-controller jimu-main-background',
      allConfigs: [],
      openedWidgetId: '',
      activeIconNode: null,

      postCreate: function() {
        this.inherited(arguments);
        console.log('postCreate');

        this.allConfigs = this.getAllConfigs();

        for (var i = 0; i < this.allConfigs.length; i++) {
          this._createIconNode(this.allConfigs[i]);
        }

      },

      startup: function() {
        this.inherited(arguments);
        console.log('startup');

      },

      _createIconNode: function(iconConfig, targetNode) {
        var iconNode, iconImage;
        if (!targetNode) targetNode = this.containerNode;
        iconNode = document.createElement('DIV');
        iconNode.className = 'icon-node';
        if (iconConfig.icon) {
          iconImage = document.createElement('img');
          iconImage.src = iconConfig.icon;
        }
        if (iconConfig.label) {
          iconNode.title = iconConfig.label;
          iconImage.alt = iconConfig.label;
        }
        iconNode.appendChild(iconImage);
        targetNode.appendChild(iconNode);
        // check if the widget is set to open at start
        if (iconConfig.openAtStart) {
          this.activeIconNode = iconNode;
          domClass.add(iconNode, 'jimu-state-active');
          this._showWidgetContent(iconConfig);
        }


        var self = this;
        this.own(on(iconNode, 'click', function() {
          query('.jimu-state-active', self.domNode).removeClass('jimu-state-active');
          if (self.activeIconNode === this) {
            self.panelManager.closePanel(iconConfig.id + '_panel');
            self.activeIconNode = null;
            return;
          }
          domClass.add(this, 'jimu-state-active');
          self._showWidgetContent(iconConfig);
          self.activeIconNode = this;
        }));



        return iconNode;
      },

      _showWidgetContent: function(iconConfig) {
        if (this.openedWidgetId) {
          this.panelManager.closePanel(this.openedWidgetId + '_panel');
        }
        var self = this;
        this.panelManager.showPanel(iconConfig).then(function(widget) {
          // the panel displays successfully
          self.own(on.once(widget, 'close', function() {
            domClass.remove(self.activeIconNode, 'jimu-state-active');
            self.activeIconNode = null;
          }));
        }, function(err) {
          // the panel failed to display

        });

        this.openedWidgetId = iconConfig.id;
      }





    });
  });