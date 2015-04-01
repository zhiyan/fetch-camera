var http = require("http");
var cheerio = require("cheerio");
var fs = require("fs");
var async = require("async");
var iconv = require("iconv-lite");

var dataArr = [];
var total = 0;
var cbs = [];

var attrMap = {
  "镜头用途" : "use",
  "焦距范围" : "scope",
  "镜头卡口" : "interface",
  "滤镜尺寸" : "size",
  "镜头结构" : "structure",
  "最大光圈" : "max",
  "最小光圈" : "min",
  // "防抖性能" : ""
  "最近聚焦距离" : "distance"
}

function request( url,cb ){
  http.get(url,function(res){
    var data = "";
    res.on('data', function (chunk) {
      data += iconv.decode(chunk,'gbk');
    });
    res.on("end", function() {
      parseData(data,cb);
      cb(null,Math.random());
    });
  });
}

function parseData( data ){
  if( data ){
    var $ = cheerio.load(data);

    var list = $(".list-item");
    list.each(function(i,v){
      var $this = $(this),
          $intro = $this.find(".pro-intro"),
          $li = $intro.find(".param li"),
          params = [],
          item = {
            "name" : nameHandler( $intro.find("h3 a").text() )
          };

          $li.each(function(){
            var $this = $(this),
                name = $this.find("span").text().replace(/:|：/,"");
            if( attrMap[name] ){
              item[attrMap[name]] = $this.attr("title");
            }
          });           
          dataArr.push( item ); 
    });
    console.log("## total: " + dataArr.length)
  }
}

function nameHandler( name ){
  name = name.replace(/佳能|尼康/g,"").replace(/\(.*\)/g,"");
  return name;
}

var num = 1;
function count(){
  return num++;
}

// total 65
for(var i = 1; i<= 60;i++)
  cbs.push(function(callback){
    request("http://detail.zol.com.cn/lens/"+count()+".html",callback)
  })

async.parallel( cbs, function(err,results){
  console.log("total" + dataArr.length)
  fs.writeFile('data/data.json', JSON.stringify(dataArr), function (err) {
    if (err) throw err;
  });
});
