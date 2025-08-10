// ========== Boss Jump Attack Configuration ==========

// [0]: Vertical jump power
// [1]: Horizontal speed
// [2]: Damage to targets in range
// [3]: Upward knockback for targets
// [4]: Target radius
// [5]: Target entity type (-1 = any)
var bossJumpAttack = [1, 0.7, 5, 0.9, 8, -1];

// Landing particles
var bossPcle = ["crit", "campfire_signal_smoke"];

// Landing sound
var bossSound = "entity.generic.explode";

// Probability of vertical-only jump
var bossChance = 0.5;

// NPC size: [minimum, maximum]
var bossSize = [15, 23];


var bossTick = 100;

// Potion effect to apply on impact: [effectId, duration, amplifier]
var bossPotion = [2, 2, 5]; // Slowness II for 2 seconds

// ========== Projectile Configuration ==========

// Enable projectiles on landing
var enableProjectiles = true;

// [0]: damage, [1]: speed, [2]: count
var projConfig = [1, 1, 20];

// Projectile visuals
var projParticle = ["item_slime", "crit"];
var projectileImpactSound = "entity.slime.squish";

// ========== Initialization ==========
function init(e) {
    var n = e.npc;

    // Set initial size
    n.display.setSize(bossSize[0]);
    if (!n.timers.has(1)) n.timers.forceStart(1,bossTick, true);
}

// ========== Timer Events ==========
function timer(e) {
    var n = e.npc;
    var w = n.getWorld();
    // [1] Jump decision
    if (e.id == 1 && n.getAttackTarget() && !n.getTimers().has(2)) {
        var t = n.getAttackTarget();
        var isPlain = Math.random() < bossChance;
        n.timers.stop(1)    
        if (isPlain) {
            // Vertical jump only
            n.setMotionY(bossJumpAttack[0]);
        } else {
            // Jump toward target
            var dx = t.x - n.x, dz = t.z - n.z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            n.setMotionX(dx / dist * bossJumpAttack[1]);
            n.setMotionY(bossJumpAttack[0]);
            n.setMotionZ(dz / dist * bossJumpAttack[1]);
        }
        n.display.setSize(bossSize[1]);
        // Start landing detection
        n.timers.forceStart(2, 2, true);
    }

    // [2] On landing
    if (e.id == 2) {
        if (!n.getMCEntity().m_20096_()) return;
        n.timers.stop(2);
        n.timers.forceStart(1, bossTick, true);
        n.display.setSize(bossSize[0]);
        // Landing sound
        w.playSoundAt(n.getPos(), bossSound, 1, 1);

        // Deal area damage

        var targs = w.getNearbyEntities(n.getPos(), bossJumpAttack[4], bossJumpAttack[5]);

        for (var i = 0; i < targs.length; i++) {
        var t = targs[i];
        if (t === n) continue;
        // Apply damage, knock-up, 
        t.damage(bossJumpAttack[2])
        t.setMotionY(bossJumpAttack[3])}

        // Ring + smoke particles
        CircleParticlesDual(n, bossPcle[0], bossPcle[1], 1, bossJumpAttack[4], 1.2, 30, 15);

        // Launch projectiles outward
        if (enableProjectiles) {
        for (var i = 0; i < projConfig[2]; i++) {
        var angle = Math.random() * Math.PI * 2;
        var vx = Math.cos(angle) * projConfig[1];
        var vz = Math.sin(angle) * projConfig[1];

        var proj = n.shootItem(n.x, n.y + 1, n.z, w.createItem("minecraft:slime_ball", 1), 50);
        try { proj.enableEvents(); } catch(err) {}

        proj.setMotionX(vx);
        proj.setMotionY(0.2);
        proj.setMotionZ(vz);
    }}}
}

// ========== Projectile Events ==========
function projectileImpact(e) {
    if (e.type != 0) return; // Only trigger on entity hit

    var p = e.projectile;
    var w = p.getWorld();
    var t = e.API.getIEntity(e.target);
    if (!t) return;

    // Damage + potion effect
    t.damage(projConfig[0]);
    t.addPotionEffect(bossPotion[0], bossPotion[1], bossPotion[2], false);
    w.playSoundAt(p.getPos(), projectileImpactSound, 1, 1);
}

function projectileTick(e) {
    var proj = e.projectile;

    // Trail particle while flying
    proj.world.spawnParticle(projParticle[0], proj.x, proj.y, proj.z, 0, 0, 0, 0, 3);
    proj.world.spawnParticle(projParticle[1], proj.x, proj.y, proj.z, 0, 0, 0, 0, 1)
}

// ========== Circle Particle Effect ==========
function CircleParticlesDual(npc, ringParticle, columnParticle, radiusStep, RadiusMax, radiusMultiplier, Speed, AngleStep) {
var Thread = Java.type("java.lang.Thread");
var CircleThread = Java.extend(Thread, {
run: function () {
var Y = npc.y + 1, radius = radiusStep;
npc.world.spawnParticle(columnParticle, npc.x, Y, npc.z, 0.1, 1, 0.1, 0, 20);
while (radius <= RadiusMax) {
for (var angle = 0; angle < 360; angle += AngleStep) {
var rad = angle * Math.PI / 180, dx = radius * Math.cos(rad), dz = radius * Math.sin(rad);
npc.world.spawnParticle(ringParticle, npc.x+dx, Y, npc.z+dz, 0, 0, 0, 0, 1)}
Thread.sleep(Speed);
radius *= radiusMultiplier}}});
new CircleThread().start()}