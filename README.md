# ROBERTITO.JS v1.0.0

Framework reactivo minimalista para crear interfaces de usuario dinámicas.

**Desarrollado por**: Roberto Miguel Costi

---

## 📖 Tabla de Contenidos

- [Instalación](#instalación)
- [Inicio Rápido](#inicio-rápido)
- [Directivas](#directivas)
  - [r-data](#r-data)
  - [r-init](#r-init)
  - [r-show](#r-show)
  - [r-text](#r-text)
  - [r-model](#r-model)
  - [r-for](#r-for)
  - [r-bind](#r-bind-o-)
  - [r-on](#r-on-o-)
  - [r-effect](#r-effect)
- [Propiedades Mágicas](#propiedades-mágicas)
  - [$element](#element)
  - [$nextTick](#nexttick)
- [Ejemplos](#ejemplos)
- [Licencia](#licencia)

---

## Instalación

Incluir robertito.js en tu HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Versión minificada (recomendada para producción) -->
    <script defer src="/lib/robertito.min.js"></script>

    <!-- O versión completa (para desarrollo) -->
    <!-- <script defer src="/lib/robertito.js"></script> -->
</head>
<body>
    <div r-data="{ count: 0 }">
        <button @click="count++">Clicks: <span r-text="count"></span></button>
    </div>
</body>
</html>
```

**Requisitos:**
- Navegador moderno con soporte ES6 Proxy
- Sin dependencias externas
- **25KB** sin minificar / **9.1KB** minificado

---

## Inicio Rápido

### Componente básico

```html
<div r-data="{ message: 'Hello World' }">
    <p r-text="message"></p>
</div>
```

### Componente con función

```html
<div r-data="Counter()">
    <button @click="increment()">
        Count: <span r-text="count"></span>
    </button>
</div>

<script>
function Counter() {
    return {
        count: 0,

        increment() {
            this.count++;
        }
    }
}
</script>
```

---

## Directivas

### `r-data`

Define los datos reactivos del componente.

**Uso:**
```html
<!-- Objeto literal -->
<div r-data="{ name: 'Roberto', age: 25 }">
    <p r-text="name"></p>
</div>

<!-- Función que retorna objeto -->
<div r-data="User()">
    <p r-text="name"></p>
</div>

<!-- Alcance vacío (hereda del padre) -->
<div r-data="">
    <!-- Accede a datos del componente padre -->
</div>
```

**Inicialización automática con `init()`:**
```javascript
function MyComponent() {
    return {
        data: null,

        // Se ejecuta automáticamente al inicializar
        init() {
            console.log('Component ready');
            this.data = 'Initialized';
        }
    }
}
```

**Inicialización asíncrona:**
```javascript
function AppWithAPI() {
    return {
        users: [],

        async init() {
            // Los hijos se procesan DESPUÉS de que termine esto
            const response = await fetch('/api/users');
            this.users = await response.json();
        }
    }
}
```

---

### `r-init`

Ejecuta código cuando el elemento se inicializa.

**Uso:**
```html
<div r-data="{ message: '' }" r-init="message = 'Loaded'">
    <p r-text="message"></p>
</div>

<!-- Con async/await -->
<div r-data="App()" r-init="await loadData()">
    <!-- Se procesa después de loadData() -->
</div>

<!-- Múltiples sentencias -->
<div r-init="console.log('Starting'); counter = 0">
</div>
```

---

### `r-show`

Muestra u oculta elemento con `display: none`.

**Uso:**
```html
<div r-data="{ open: true }">
    <button @click="open = !open">Toggle</button>

    <div r-show="open">
        This content can be hidden
    </div>
</div>

<!-- Con expresiones -->
<div r-data="{ items: [] }">
    <p r-show="items.length === 0">No items</p>
    <p r-show="items.length > 0">There are <span r-text="items.length"></span> items</p>
</div>
```

---

### `r-text`

Actualiza el contenido de texto del elemento.

**Uso:**
```html
<div r-data="{ name: 'Roberto' }">
    <!-- Texto simple -->
    <h1 r-text="name"></h1>

    <!-- Concatenación -->
    <p r-text="'Hello ' + name"></p>

    <!-- Template literals -->
    <span r-text="`Welcome, ${name}!`"></span>

    <!-- Expresiones -->
    <p r-text="age >= 18 ? 'Adult' : 'Minor'"></p>
</div>
```

---

### `r-model`

Binding bidireccional para inputs.

**Uso:**
```html
<div r-data="{
    text: '',
    number: 0,
    active: false,
    option: 'A',
    country: 'us'
}">
    <!-- Text input -->
    <input type="text" r-model="text">
    <p>You wrote: <span r-text="text"></span></p>

    <!-- Number input -->
    <input type="number" r-model="number">

    <!-- Checkbox -->
    <label>
        <input type="checkbox" r-model="active">
        <span r-text="active ? 'Active' : 'Inactive'"></span>
    </label>

    <!-- Radio buttons -->
    <input type="radio" name="option" value="A" r-model="option"> Option A
    <input type="radio" name="option" value="B" r-model="option"> Option B

    <!-- Select -->
    <select r-model="country">
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
        <option value="es">Spain</option>
    </select>

    <!-- Textarea -->
    <textarea r-model="text"></textarea>
</div>
```

**Propiedades anidadas:**
```html
<div r-data="{ user: { name: '', email: '' } }">
    <input r-model="user.name" placeholder="Name">
    <input r-model="user.email" placeholder="Email">
</div>
```

---

### `r-for`

Itera sobre arrays para renderizar listas.

**Sintaxis:** `item in items`

**Uso:**
```html
<!-- Básico -->
<div r-data="{ fruits: ['Apple', 'Banana', 'Orange'] }">
    <ul>
        <template r-for="fruit in fruits">
            <li r-text="fruit"></li>
        </template>
    </ul>
</div>

<!-- Con índice -->
<div r-data="{ items: ['A', 'B', 'C'] }">
    <template r-for="(item, index) in items">
        <p>
            <span r-text="index + 1"></span>.
            <span r-text="item"></span>
        </p>
    </template>
</div>

<!-- Con objetos -->
<div r-data="{ users: [
    { id: 1, name: 'Ana' },
    { id: 2, name: 'Luis' }
] }">
    <template r-for="user in users" :key="user.id">
        <div r-text="user.name"></div>
    </template>
</div>
```

**Notas importantes:**
- Debe usarse en un `<template>`
- Opcionalmente usa `:key` para optimización
- El array se actualiza automáticamente con: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`

**Agregar/eliminar items:**
```javascript
function List() {
    return {
        items: [],

        add(item) {
            this.items.push(item); // ✅ Se actualiza automáticamente
        },

        remove(index) {
            this.items.splice(index, 1); // ✅ Se actualiza automáticamente
        }
    }
}
```

---

### `r-bind` (o `:`)

Vincula atributos HTML dinámicamente.

**Sintaxis corta:** `:attribute="value"`

**Uso:**
```html
<div r-data="{
    itemId: 42,
    color: 'red',
    active: true,
    loading: false
}">
    <!-- Atributos normales -->
    <div :id="'item-' + itemId"></div>

    <!-- Atributos booleanos -->
    <button :disabled="loading">Save</button>
    <input type="checkbox" :checked="active">

    <!-- Class (string) -->
    <div :class="active ? 'active' : 'inactive'"></div>

    <!-- Class (objeto) -->
    <div :class="{
        'active': active,
        'disabled': !active,
        'loading': loading
    }"></div>

    <!-- Style (string) -->
    <div :style="'background: ' + color + '; padding: 20px'"></div>

    <!-- Style (objeto) -->
    <div :style="{
        background: color,
        padding: '20px',
        fontSize: '16px'
    }"></div>

    <!-- Src de imagen -->
    <img :src="'/images/' + image + '.png'" :alt="description">
</div>
```

---

### `r-on` (o `@`)

Escucha eventos del DOM.

**Sintaxis corta:** `@event="code"`

**Uso básico:**
```html
<div r-data="{ count: 0 }">
    <!-- Expresión inline -->
    <button @click="count++">Increment</button>

    <!-- Llamar método -->
    <button @click="save()">Save</button>

    <!-- Pasar parámetros -->
    <button @click="delete(42)">Delete</button>
</div>
```

**Modificadores:**
```html
<div r-data="{}">
    <!-- .prevent - Previene acción por defecto -->
    <form @submit.prevent="handleSubmit()">
        <button type="submit">Submit</button>
    </form>

    <!-- .stop - Detiene propagación -->
    <div @click.stop="handleClick()">
        Click here
    </div>

    <!-- .enter - Solo ejecuta cuando se presiona Enter -->
    <input @keyup.enter="search()" placeholder="Press Enter">

    <!-- .escape - Solo ejecuta cuando se presiona Escape -->
    <div @keydown.escape="closeModal()">Modal</div>

    <!-- .space - Solo ejecuta cuando se presiona Espacio -->
    <div @keypress.space="activate()">Press space</div>

    <!-- .tab - Solo ejecuta cuando se presiona Tab -->
    <input @keydown.tab="nextField()">

    <!-- Múltiples modificadores -->
    <a href="#" @click.prevent.stop="handleLink()">Link</a>
</div>
```

**Modificadores disponibles:**
- `.prevent` - Llama `event.preventDefault()`
- `.stop` - Llama `event.stopPropagation()`
- `.enter` - Solo ejecuta cuando se presiona Enter
- `.escape` - Solo ejecuta cuando se presiona Escape
- `.space` - Solo ejecuta cuando se presiona Espacio
- `.tab` - Solo ejecuta cuando se presiona Tab

**Eventos comunes:**
```html
<div r-data="{ value: '' }">
    <!-- Click -->
    <button @click="action()">Click</button>

    <!-- Input (en tiempo real) -->
    <input @input="search()">

    <!-- Change (al perder foco) -->
    <select @change="selectionChanged()">...</select>

    <!-- Submit -->
    <form @submit.prevent="submit()">...</form>

    <!-- Teclado -->
    <input @keyup.enter="confirm()">

    <!-- Mouse -->
    <div @mouseenter="show()" @mouseleave="hide()">
        Hover me
    </div>
</div>
```

---

### `r-effect`

Ejecuta código cuando cambian variables reactivas.

**Uso:**
```html
<!-- Efecto simple -->
<div r-data="{ count: 0 }"
     r-effect="console.log('Count changed:', count)">
    <button @click="count++">Increment</button>
</div>

<!-- Múltiples dependencias -->
<div r-data="{ firstName: '', lastName: '' }"
     r-effect="console.log('Full name:', firstName + ' ' + lastName)">
    <input r-model="firstName" placeholder="First Name">
    <input r-model="lastName" placeholder="Last Name">
</div>
```

**Nota:** El efecto se ejecuta inmediatamente y cada vez que cambia alguna variable usada en la expresión.

---

## Propiedades Mágicas

### `$element`

Referencia al elemento DOM del componente.

**Uso:**
```javascript
function MyComponent() {
    return {
        highlight() {
            // Acceder al elemento directamente
            this.$element.style.border = '2px solid red';
            this.$element.scrollIntoView();
        },

        getWidth() {
            return this.$element.offsetWidth;
        }
    }
}
```

```html
<div r-data="MyComponent()">
    <button @click="highlight()">Highlight container</button>
</div>
```

---

### `$nextTick`

Espera a que el DOM se actualice antes de ejecutar código.

**Uso:**
```javascript
function ImageGallery() {
    return {
        images: [],

        async addImage(img) {
            // Agregar imagen al array
            this.images.push(img);

            // Esperar a que el DOM se actualice
            await this.$nextTick();

            // Ahora el elemento existe en el DOM
            const canvas = document.getElementById('canvas-0');
            this.drawOnCanvas(canvas, img);
        }
    }
}
```

**Cuándo usar:**
- Cuando necesitas manipular un elemento que acabas de agregar
- Después de cambiar datos y necesitas medir el DOM
- Para asegurar que las animaciones funcionen correctamente

---

## Ejemplos

### Contador Simple

```html
<div r-data="{ count: 0 }">
    <h1 r-text="count"></h1>
    <button @click="count++">+</button>
    <button @click="count--">-</button>
    <button @click="count = 0">Reset</button>
</div>
```

---

### Formulario con Validación

```html
<div r-data="Form()">
    <form @submit.prevent="submit()">
        <input
            type="text"
            r-model="name"
            placeholder="Name">

        <input
            type="email"
            r-model="email"
            placeholder="Email">

        <p r-show="error" r-text="error" style="color: red;"></p>

        <button
            type="submit"
            :disabled="submitting">
            <span r-text="submitting ? 'Submitting...' : 'Submit'"></span>
        </button>
    </form>
</div>

<script>
function Form() {
    return {
        name: '',
        email: '',
        error: '',
        submitting: false,

        async submit() {
            this.error = '';

            if (!this.name || !this.email) {
                this.error = 'All fields are required';
                return;
            }

            this.submitting = true;

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: this.name,
                        email: this.email
                    })
                });

                if (response.ok) {
                    alert('Form submitted!');
                    this.name = '';
                    this.email = '';
                }
            } catch (e) {
                this.error = 'Error submitting form';
            } finally {
                this.submitting = false;
            }
        }
    }
}
</script>
```

---

### Lista de Tareas

```html
<div r-data="TodoList()">
    <input
        r-model="newTodo"
        @keyup.enter="add()"
        placeholder="New task">

    <button @click="add()">Add</button>

    <ul>
        <template r-for="(todo, index) in todos" :key="index">
            <li>
                <input
                    type="checkbox"
                    :checked="todo.completed"
                    @change="toggleTodo(index)">

                <span
                    r-text="todo.text"
                    :style="{ textDecoration: todo.completed ? 'line-through' : 'none' }">
                </span>

                <button @click="remove(index)">X</button>
            </li>
        </template>
    </ul>

    <p r-show="todos.length === 0">No tasks</p>
</div>

<script>
function TodoList() {
    return {
        todos: [],
        newTodo: '',

        add() {
            if (this.newTodo.trim()) {
                this.todos.push({
                    text: this.newTodo,
                    completed: false
                });
                this.newTodo = '';
            }
        },

        remove(index) {
            this.todos.splice(index, 1);
        },

        toggleTodo(index) {
            this.todos[index].completed = !this.todos[index].completed;
        }
    }
}
</script>
```

---

### Select Dinámico con API

```html
<div r-data="SelectAPI()">
    <label r-text="label"></label>

    <select r-model="selected" @change="onChange()">
        <option value="">Select...</option>
        <template r-for="item in items" :key="item.id">
            <option :value="item.id" r-text="item.name"></option>
        </template>
    </select>

    <span r-show="loading">Loading...</span>
    <p r-show="error" r-text="error" style="color: red;"></p>
</div>

<script>
function SelectAPI() {
    return {
        label: 'Select an option',
        items: [],
        selected: '',
        loading: false,
        error: '',

        async init() {
            await this.loadItems();
        },

        async loadItems() {
            this.loading = true;
            this.error = '';

            try {
                const response = await fetch('/api/items');
                this.items = await response.json();
            } catch (e) {
                this.error = 'Error loading data';
            } finally {
                this.loading = false;
            }
        },

        onChange() {
            const item = this.items.find(i => i.id == this.selected);
            console.log('Selected:', item);
        }
    }
}
</script>
```

---

### Tabs (Pestañas)

```html
<div r-data="{ currentTab: 'home' }">
    <div>
        <button
            @click="currentTab = 'home'"
            :class="{ 'active': currentTab === 'home' }">
            Home
        </button>
        <button
            @click="currentTab = 'profile'"
            :class="{ 'active': currentTab === 'profile' }">
            Profile
        </button>
        <button
            @click="currentTab = 'settings'"
            :class="{ 'active': currentTab === 'settings' }">
            Settings
        </button>
    </div>

    <div r-show="currentTab === 'home'">
        <h2>Home</h2>
        <p>Home content...</p>
    </div>

    <div r-show="currentTab === 'profile'">
        <h2>Profile</h2>
        <p>Profile content...</p>
    </div>

    <div r-show="currentTab === 'settings'">
        <h2>Settings</h2>
        <p>Settings content...</p>
    </div>
</div>
```

---

### Modal/Diálogo

```html
<div r-data="{ open: false }">
    <button @click="open = true">Open Modal</button>

    <!-- Overlay -->
    <div
        r-show="open"
        @click="open = false"
        style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5);">

        <!-- Modal -->
        <div
            @click.stop
            style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px;">

            <h2>My Modal</h2>
            <p>Modal content...</p>

            <button @click="open = false">Close</button>
        </div>
    </div>
</div>
```

---

## Licencia

MIT License

Copyright (c) 2025 Roberto Miguel Costi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
