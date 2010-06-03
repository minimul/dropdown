/*  Dropdown is written by Christian Pelczarski
 *  and is freely distributable under the terms of an MIT-style license.
/*--------------------------------------------------------------------------*/
var Dropdown = Class.create( { 
  initialize: function(element,data,callback,options) {
    this.options = Object.extend({
      groupsOf: 12,
      layout: 'column',
      alignRight: false,
      mouseOverColor: 'gray',
      offsetTop: false,
      offsetLeft: false
     },options || {});
    this.element = $(element);
    this.callback = callback;
    // If data is not an array then it must be JSON and in that case turn it into a Hash
    this.dataIsArray = Object.isArray(data);
    this.data = this.dataIsArray ? data : $H(data);
    this.dataIsEmpty = this.data.size() == 0;
    if(this.dataIsEmpty){
      this.data = this.dataIsArray ? ['empty'] : $H({ empty:'empty' }); 
    }
    if(!this.element.tagName.match(/a/i)){
      this.element.setStyle({ cursor: 'pointer' });
    }
    this.element.observe('click',this.trigger.bindAsEventListener(this) );
  },
  trigger: function(event){
    event.stop();// needs to be at the top
    this.render();
    this.closeHandler = this.close.bindAsEventListener(this);
    var element = this.dropDiv;
    if(element.visible()){
      this.closeHandler();
      return false;
    }
    this.baseEvent = event;
    var position = this.figureOutPosition();
    element.setStyle(position);
    if(this.options.alignRight || this.isRightSide()){
      this.standardLeft = element.getStyle('left').sub('px','');
      var elDim = this.element.getDimensions();
      var gap   = element.getWidth() - elDim.width;
      var newLeft = this.standardLeft - gap;
      newLeft = newLeft || 0;
      element.setStyle({ left: newLeft + 'px' });
    }
    element.show();
    (function(){ document.observe('click',this.closeHandler); }.bind(this)).delay(.5);// need delay a half-second so the dropdown doesn't close immediately
  },
  render: function(){
    this.arrange();
    this.tableBuilder();
    var html = this.html.join('');
    if(Object.isUndefined(this.dropDiv)){ 
      this.dropDiv = new Element('div',{ 'class':'dropDown',style: 'display:none;'});
      this.dropDiv.insert(html);
      $(document.body).insert({ bottom: this.dropDiv });
    }else{
      this.dropDiv.update(html);
    }
    if(!this.dataIsEmpty){
      this.attachEvents();
    }
  },
  attachEvents: function(){
    var mouseOverColor = this.options.mouseOverColor;
    this.dropDiv.select('div.dropDownInner')
      .invoke('observe','click', this.callbackEvent.bindAsEventListener(this) )
      .invoke('observe','mouseover',function(){  
        this.down(1).setStyle({ color:'white'});
        this.setStyle( {background: mouseOverColor });
      })
      .invoke('observe','mouseout',function(){ 
        this.down(1).setStyle({ color:'black'}); 
        this.setStyle( {background: '' });// this will return to current background
      });
  },
  tableBuilder: function(){
    this.html = ['<table>']; 
    this.td = '<td><div class="dropDownInner"><span class="inside" style="display:none;">#{key}</span><span class="outside">#{value}</span></div></td>';
    this.tdBlank = '<td>&nbsp;</td>';
    this.options.layout == 'column' ? this.tableLayoutColumn() : this.tableLayoutAcross();
  },
  tableLayoutAcross: function(){
    this.data.inGroupsOf(this.options.groupsOf).each(function(group){
      this.html.push('<tr>');
      group.each(function(ar){
        var str = this.tableLayoutGuts(ar);
        this.html.push(str);
      },this);
      this.html.push('</tr>');
    },this);
    this.html.push('</table>');
  },
  tableLayoutColumn: function(){
    this.html.push('<tr>');
    this.data.inGroupsOf(this.options.groupsOf).each(function(group){
      this.html.push('<td valign="top"><table>');
      group.each(function(ar){
        if(ar == null) return;
        this.html.push('<tr>');
        var str = this.tableLayoutGuts(ar);
        this.html.push(str);
        this.html.push('</tr>');
      },this);
      this.html.push('</table></td>');
    },this);
    this.html.push('</tr></table>');
  },
  tableLayoutGuts: function(ar){
    if(ar == null){
     var str = this.tdBlank;
    }else{
      if(this.dataIsArray){
        var key = ar;var value = ar;
      }else{
        var key = ar.first();var value = ar.last();
      }
      var str = this.td.interpolate( { key: key , value: value } );
    }
    return str;
  },
  callbackEvent: function(event){ 
    this.values = this.extract(event.target);
    this.callback();
    this.close();
  },
  isRightSide: function(){
    var elementPos = this.element.viewportOffset();
    var screenDim  = document.viewport.getDimensions();
    var mid = screenDim.width / 2;
    return mid < elementPos.first();
  },
  figureOutPosition: function(){
    var pos   = this.baseEvent.element().viewportOffset();
    var viewp = document.viewport.getScrollOffsets();
    var elDim = this.element.getDimensions();
    var properTop = pos.last() + viewp.last() + elDim.height;
    if(this.options.offsetTop !== false){ properTop += this.options.offsetTop }
    var properLeft = pos.first();
    if(this.options.offsetLeft !== false){ properLeft += this.options.offsetLeft }
    var style = "top:#{top}px;left:#{left}px;".interpolate({ top:properTop, left:properLeft });
    return style;
  },
  close: function(event){
    var element = this.dropDiv;
    // if the event is undefined this is meant to be a forced close
    var factor = Object.isUndefined(event) ? true : !this.clicked(event,element);
    if(factor){
      if(element){// Still need to make sure there is element
        element.hide();
        // Need to reset back to the alignLeft
        if(this.standardLeft){
          element.setStyle({ left: this.standardLeft + 'px' });
        }
      }
      document.stopObserving('click',this.closeHandler);
    }
  },
  clicked: function(event,element){
    var o = element.cumulativeOffset();
    var pointer = event.pointer();
    var dim = element.getDimensions();
    var rt    = o.left + dim.width;
    var btm   = o.top + dim.height;
    var clicked = (pointer.x > o.left && pointer.x < rt && pointer.y > o.top && pointer.y < btm);
    return clicked;
  },
  arrange: function(){
    if(this.options.sortByOutside){
      this.sort(false,false);
    }
  },
  extract: function(obj){
    var obj = obj.up('td');
    var r = $H();
    var ins = this.text(obj.down('.inside'));
    r.set('inside',ins);
    var out = this.text(obj.down('.outside'));
    r.set('outside',out);
    return r.toObject();
  },
  text: function(el){
    return el.textContent || el.innerText; 
  },
  add: function(options){
    var inside      = options.inside;
    var outside     = options.outside || false;
    var sortByKey   = options.sortByKey || false; 
    var reverseOrder= options.reverseOrder || false;
    var sortOff     = options.sortOff || false;
    if(outside){// if outside is present then it is a Hash 
      this.data.set(inside,outside);
      // Need to re-sort
      if(!sortOff){
        this.sort(sortByKey,reverseOrder);
      }
    }else{
      this.data.push(inside);
      if(!sortOff){
        this.data = this.data.uniq().sort();
        if(reverseOrder){
          this.data.reverse();
        }
      }
    }
  },
  sort: function(sortByKey,reverseOrder){
    var as = this.data.sortBy(function(pair){ return sortByKey ? pair.key : pair.value; });
    // Blank out the data array because we need to reset it in the proper
    // order after the new addition
    this.data = $H();
    if(reverseOrder){
      as.reverse();
    }
    as.each(function(a){ this.data.set(a.first(),a.last()); },this);
  }
});

Element.addMethods({
  dropdown: function(element,data,callback,options){
    element = $(element);
    return new Dropdown(element,data,callback,options);
  }
});
