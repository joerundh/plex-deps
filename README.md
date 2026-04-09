# `plex-deps`

## Description

The module `plex-deps` provides a class `Plex`, instances of which represent variables with capacity for *interdependency*.

With `Plex` instances created and dependency defined between them, assigning a new value to one or more will initiate an automatic update of all variables that depend on them.

If more variables depend on each other transitively, next-level dependent variables will be updated in turn when the variables on which they depend are themselves updated.

Dependency can be defined in either direction between two or more variables. During a dependency update, the update order of dependent variables depends on which variables are explicitly updated by the user. 

## Usage

* Define a `Plex` instance with the *constructor*:

    ```ts
    const x = new Plex(0);
    ```

    Here, `0` becomes the initial value of the `Plex` instance `x`; 

* Define a dependent `Plex` instance with *the static function* `define`:

    ```ts
    const y = Plex.define([ x ], (a) => a*a)
    ```

    The function `define` takes two arguments: an array of `Plex` instances `antecedents` whose values factor into that of the dependent; and a function which computes the new values of the dependent, given the values of the `Plex` instances in `antecedents`; therewith, the new instance `y` depends on the existing instance `x`; the initial value of `y` is computed from the value of `x`, using the provided value function;

* Add a dependency to an existing `Plex` instance with *the instance method* `relate`:

    ```ts
    x.relate([ y ], Math.sqrt);
    ```

    or the static function `relate`:

    ```ts
    Plex.relate(x, [ y ], Math.sqrt);
    ```

    The function `relate` takes the same arguments as `define`, but establishes the dependency for an existing `Plex` instance instead of creating a new one.

## Examples

**Picking object values:**

One instance `pages` takes objects as values, containing properties `name` and `age`, which are assigned to `Plex` instances of the same respective names.

```ts
const person = new Plex(null);

const name = Plex.define([ person ], obj => obj?.name);
const age = Plex.define([ person ], obj => obj?.age);

person.value = { name: "Patrick", age: 36 };
console.log(`${name.value} is ${age.value} years old.`);
// Output: Patrick is 36 years old.

person.value = { name: "Michael", age: 31 };
console.log(`${name.value} is ${age.value} years old.`);
// Output: Michael is 31 years old.
```

**Sums of squares:**

One `Plex` instance `x` is assigned integer values, another instance `y` updated as `x.value + 1`, and a third `z` as `x.value + y.value`, or `2*x.value + 1`. Finally, their product divided by 6, giving the sum of the squares of the integers up to and including `x.value`, is assigned to a fourth instance `sum`. 

```ts
const x = new Plex(0);

const y = Plex.define([ x ], (a) => a + 1);
const z = Plex.define([ x, y ], (a, b) => a + b);

const sum = Plex.define([ x, y, z ], (a, b, c) => a*b*c/6);

const sums = new Array(10).fill(0).map((_, index) => {
    const n = index + 1;
    x.value = n;
    return sum.value;
});

console.log(sums);  // (10) [1, 5, 14, 30, 55, 91, 140, 204, 285, 385]
```

**Bidirectionality:**

Two variables depending on each other, with the first taking the square of the value assigned to the other, while the other is assigned the square root of the first.

```ts
const x = new Plex(0);
const y = Plex.define([ x ], a => a*a);
x.relate([ y ], Math.sqrt);

x.value = 5;
console.log(x.value, y.value);  // 5, 25

y.value = 49;
console.log(x.value, y.value);  // 7, 49
```

**Coordinate transforms:**

Sets of three and three variables represent different three-dimensional coordinates. Relations are established, and when one set is updated, so is the other in turn. This example illustrates the use of the static function `assign` for batched assignments, which also leaves the user-assigned instances out of the dependency update. The function `format` is defined and used to disregard floating-point errors.

```ts
const format = num => Math.round(10000*num)/10000;

const x = new Plex(0);
const y = new Plex(0);
const z = new Plex(0);

const r = Plex.define([ x, y, z ], (x, y, z) => Math.sqrt(x*x + y*y + z*z));
const theta = Plex.define([ x, y, z ], (x, y, z) => Math.atan2(Math.sqrt(x*x + y*y), z));
const phi = Plex.define([ x, y, z ], (x, y, z) => Math.atan2(y, x));

x.relate([ r, theta, phi ], (r, theta, phi) => r*Math.sin(theta)*Math.cos(phi));
y.relate([ r, theta, phi ], (r, theta, phi) => r*Math.sin(theta)*Math.sin(phi));
z.relate([ r, theta, phi ], (r, theta, phi) => r*Math.cos(theta));

// Initial values
console.log({ x: format(x.value), y: format(y.value), z: format(z.value) });
console.log({ r: format(r.value), theta: format(theta.value), phi: format(phi.value) });
// {x: 1, y: 0, z: 0}
// {r: 0, theta: 0, phi: 0}

// Set x = 1
Plex.assign([ [ x, 1 ], [ y, y.value ], [ z, z.value ] ]);
console.log({ x: format(x.value), y: format(y.value), z: format(z.value) });
console.log({ r: format(r.value), theta: format(theta.value), phi: format(phi.value) });
// {x: 1, y: 0, z: 0}
// {r: 1, theta: 1.5708, phi: 0}

// Set phi = pi/2
Plex.assign([ [ r, r.value  ], [ theta, theta.value ], [ phi, Math.PI/2 ] ]);
console.log({ x: format(x.value), y: format(y.value), z: format(z.value) });
console.log({ r: format(r.value), theta: format(theta.value), phi: format(phi.value) });
// {x: 0, y: 1, z: 0}
// {r: 1, theta: 1.5708, phi: 1.5708}

// Set theta = 0
Plex.assign([ [ r, r.value ], [ theta, 0 ], [ phi, phi.value ] ]);
console.log({ x: format(x.value), y: format(y.value), z: format(z.value) });
console.log({ r: format(r.value), theta: format(theta.value), phi: format(phi.value) });
// {x: 0, y: 0, z: 1}
// {r: 1, theta: 0, phi: 1.5708}

// Set z = -z
Plex.assign([ [ x, x.value ], [ y, y.value ], [ z, -z.value ] ]);
console.log({ x: format(x.value), y: format(y.value), z: format(z.value) });
console.log({ r: format(r.value), theta: format(theta.value), phi: format(phi.value) });
// {x: 0, y: 0, z: -1}
// {r: 1, theta: 3.1416, phi: 0}
```

**Autodependency:**

The value function assigns the new value of `num` to `even` if the new value is even; otherwise, it assigns the existing value of `even`, effectively not updating it.

```ts
const num = new Plex(0);
const even = new Plex(0);

Plex.relate(even, [ even, num ], (a, b) => b % 2 === 0 ? b : a);

num.value = 6;
console.log(num.value, even.value);     // 6 6

num.value = 13;
console.log(num.value, even.value);     // 13 6

num.value = 120;
console.log(num.value, even.value);     // 120 120
```

## Disclaimer

`plex-deps` is designed to provide flexibility in defining reactive interdependencies, without enforcing strict constraints on user-defined functions attached to, or on values assigned to, `Plex` instances.

Users are responsible for the behaviour of these attached functions, as well as for the validity of assigned values, or for performing appropriate validation.
