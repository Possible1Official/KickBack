/* Plain data, deliberately separate from browser rendering for a future Godot port. */
window.RECOIL_LEVELS=[
 {name:'Moonlit ruins',tag:'01 / TRAINING',width:1280,height:720,gravity:430,scroll:false,spawn:[115,596],exit:[1165,578],switches:[[875,420]],
  platforms:[[0,664,1280,56],[0,0,24,720],[1256,0,24,720],[0,0,1280,20],[290,557,170,26],[615,478,190,26],[845,540,170,26]],doors:[[1040,490,28,174]],breakables:[[455,557,45,26],[500,557,45,26]],movers:[[535,595,135,24,0,-85,1]],objects:[[365,530,'crate'],[665,450,'barrel']],fans:[],labels:[[100,638,'START HERE · AIM DOWN TO LIFT'],[310,600,'ORANGE = BREAKABLE'],[610,518,'BLUE = MOVING PLATFORM'],[830,370,'SHOOT THE SWITCH ↘'],[1120,695,'EXIT →']]},
 {name:'Forgotten keep',tag:'02 / MOMENTUM',width:2300,height:720,gravity:430,scroll:true,spawn:[120,596],exit:[2170,578],switches:[[1000,385],[1910,385]],
  platforms:[[0,664,2300,56],[0,0,24,720],[2276,0,24,720],[0,0,2300,20],[300,555,190,26],[750,490,250,26],[1120,550,190,26],[1490,470,230,26],[1850,540,180,26]],doors:[[1080,450,28,214],[2055,450,28,214]],breakables:[[490,555,45,26],[535,555,45,26],[1310,550,45,26]],movers:[[580,555,145,24,0,-90,1.1],[1300,390,160,24,120,0,.7]],objects:[[380,525,'crate'],[825,460,'barrel'],[1570,440,'crate'],[1660,440,'barrel']],fans:[{x:1280,y:485,w:140,h:179,fx:0,fy:-670}],labels:[[320,600,'SHOOT CARGO MARKED ↔'],[800,430,'BARREL = SHOCKWAVE'],[1170,615,'RIDE THE AIR ↑'],[1820,430,'ONE MORE SWITCH →']]},
 {name:'Lunar crypt',tag:'03 / LOW GRAVITY',width:2600,height:720,gravity:245,scroll:true,spawn:[120,596],exit:[2460,578],switches:[[920,345],[2070,360]],
  platforms:[[0,664,2600,56],[0,0,24,720],[2576,0,24,720],[0,0,2600,20],[300,530,220,26],[740,440,250,26],[1150,540,190,26],[1580,455,240,26],[1970,500,220,26]],doors:[[1070,430,28,234],[2290,450,28,214]],breakables:[[520,530,45,26],[565,530,45,26],[1820,455,45,26]],movers:[[550,440,135,24,70,-55,.8],[1310,440,145,24,110,-50,.65]],objects:[[400,500,'barrel'],[805,410,'crate'],[1680,425,'barrel'],[2050,470,'crate']],fans:[{x:1130,y:485,w:150,h:179,fx:0,fy:-450},{x:1830,y:535,w:300,h:129,fx:280,fy:0}],labels:[[270,590,'LUNAR GRAVITY · SMALLER SHOTS'],[700,390,'BANK SHOTS: GUNS 1 & 4'],[1160,615,'AIR LIFT ↑'],[1840,610,'TAILWIND →'],[2340,695,'LAST LANDING →']]}
];
// Reserve a clear strip below the arena for the weapon HUD.
for(const l of window.RECOIL_LEVELS){
 for(const key of ['platforms','doors','breakables','movers'])for(const a of l[key])if(a[1]>25)a[1]-=65;
 for(const key of ['spawn','exit'])l[key][1]-=65;
 for(const key of ['switches','objects','labels'])for(const a of l[key])a[1]-=65;
 for(const f of l.fans)f.y-=65;
}

// Combat arenas have no destination requirement. Switches still open optional gates.
for(const l of window.RECOIL_LEVELS){l.labels=[];}
