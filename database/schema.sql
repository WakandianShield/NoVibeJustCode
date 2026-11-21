CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(60) NOT NULL,
  nombre_usuario VARCHAR(24) NOT NULL UNIQUE,
  correo VARCHAR(254) NOT NULL UNIQUE,
  resumen_contrasena VARCHAR(255) NOT NULL,
  descripcion VARCHAR(300) NOT NULL DEFAULT '',
  foto_url VARCHAR(255),
  banner_url VARCHAR(255),
  activo BOOLEAN NOT NULL DEFAULT 1,
  identificador_token_activo VARCHAR(64) UNIQUE,
  token_expira_en DATETIME,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cursos (
  id_curso BIGINT UNSIGNED PRIMARY KEY,
  titulo VARCHAR(100) NOT NULL,
  descripcion TEXT NOT NULL,
  tecnologia VARCHAR(32) NOT NULL UNIQUE,
  nivel VARCHAR(40) NOT NULL,
  orden INT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'publicado'
);

CREATE TABLE IF NOT EXISTS secciones (
  id_seccion BIGINT UNSIGNED PRIMARY KEY,
  id_curso BIGINT UNSIGNED NOT NULL,
  numero INT NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  objetivo TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'publicado',
  configuracion_proyecto JSON,
  UNIQUE (id_curso, numero),
  FOREIGN KEY (id_curso) REFERENCES cursos (id_curso),
  CHECK (numero BETWEEN 1 AND 10)
);

CREATE TABLE IF NOT EXISTS lecciones (
  id_leccion BIGINT UNSIGNED PRIMARY KEY,
  id_seccion BIGINT UNSIGNED NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  contenido LONGTEXT NOT NULL,
  orden INT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'publicado',
  UNIQUE (id_seccion, orden),
  FOREIGN KEY (id_seccion) REFERENCES secciones (id_seccion)
);

CREATE TABLE IF NOT EXISTS recursos (
  id_recurso BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  id_leccion BIGINT UNSIGNED NOT NULL,
  direccion VARCHAR(500) NOT NULL,
  autor VARCHAR(150) NOT NULL,
  licencia VARCHAR(150) NOT NULL,
  fuente VARCHAR(200) NOT NULL,
  FOREIGN KEY (id_leccion) REFERENCES lecciones (id_leccion),
  UNIQUE (id_leccion, direccion)
);

CREATE TABLE IF NOT EXISTS ejercicios (
  id_ejercicio BIGINT UNSIGNED PRIMARY KEY,
  id_leccion BIGINT UNSIGNED NOT NULL,
  enunciado TEXT NOT NULL,
  plantilla LONGTEXT NOT NULL,
  solucion_referencia LONGTEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'publicado',
  modo_evaluacion VARCHAR(20) NOT NULL,
  FOREIGN KEY (id_leccion) REFERENCES lecciones (id_leccion)
);

CREATE TABLE IF NOT EXISTS casos_prueba (
  id_caso BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  id_ejercicio BIGINT UNSIGNED NOT NULL,
  entrada TEXT NOT NULL,
  salida_esperada TEXT NOT NULL,
  es_publico BOOLEAN NOT NULL DEFAULT 1,
  orden INT NOT NULL,
  tipo_criterio VARCHAR(30) NOT NULL,
  FOREIGN KEY (id_ejercicio) REFERENCES ejercicios (id_ejercicio),
  UNIQUE (id_ejercicio, orden)
);

CREATE TABLE IF NOT EXISTS intentos (
  id_intento BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_ejercicio BIGINT UNSIGNED NOT NULL,
  codigo LONGTEXT NOT NULL,
  archivos_practica JSON,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  casos_aprobados INT NOT NULL DEFAULT 0,
  total_casos INT NOT NULL DEFAULT 0,
  retroalimentacion TEXT,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  FOREIGN KEY (id_ejercicio) REFERENCES ejercicios (id_ejercicio),
  INDEX (id_usuario, id_ejercicio, estado)
);

CREATE TABLE IF NOT EXISTS progreso (
  id_progreso BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_leccion BIGINT UNSIGNED NOT NULL,
  completada BOOLEAN NOT NULL DEFAULT 1,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  FOREIGN KEY (id_leccion) REFERENCES lecciones (id_leccion),
  UNIQUE (id_usuario, id_leccion)
);

CREATE TABLE IF NOT EXISTS logros (
  id_logro BIGINT UNSIGNED PRIMARY KEY,
  id_curso BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NOT NULL,
  nivel VARCHAR(20) NOT NULL,
  seccion_meta INT NOT NULL,
  FOREIGN KEY (id_curso) REFERENCES cursos (id_curso),
  UNIQUE (id_curso, nivel)
);

CREATE TABLE IF NOT EXISTS usuario_logro (
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_logro BIGINT UNSIGNED NOT NULL,
  obtenido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario, id_logro),
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  FOREIGN KEY (id_logro) REFERENCES logros (id_logro)
);

CREATE TABLE IF NOT EXISTS suscripciones (
  id_suscripcion BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_proveedor VARCHAR(100) NOT NULL UNIQUE,
  estado VARCHAR(30) NOT NULL,
  inicio_periodo DATETIME,
  fin_periodo DATETIME,
  renovacion_habilitada BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  INDEX (id_usuario, fin_periodo)
);

CREATE TABLE IF NOT EXISTS pagos (
  id_pago BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  id_suscripcion BIGINT UNSIGNED NOT NULL,
  id_transaccion VARCHAR(100) NOT NULL UNIQUE,
  importe DECIMAL(10, 2) NOT NULL,
  moneda CHAR(3) NOT NULL,
  estado VARCHAR(30) NOT NULL,
  fecha DATETIME NOT NULL,
  FOREIGN KEY (id_suscripcion) REFERENCES suscripciones (id_suscripcion)
);

CREATE TABLE IF NOT EXISTS amistades (
  id_amistad BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  id_usuario_a BIGINT UNSIGNED NOT NULL,
  id_usuario_b BIGINT UNSIGNED NOT NULL,
  id_solicitante BIGINT UNSIGNED NOT NULL,
  bloqueado_por BIGINT UNSIGNED,
  estado VARCHAR(20) NOT NULL,
  creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario_a) REFERENCES usuarios (id_usuario),
  FOREIGN KEY (id_usuario_b) REFERENCES usuarios (id_usuario),
  FOREIGN KEY (id_solicitante) REFERENCES usuarios (id_usuario),
  FOREIGN KEY (bloqueado_por) REFERENCES usuarios (id_usuario),
  UNIQUE (id_usuario_a, id_usuario_b),
  CHECK (id_usuario_a < id_usuario_b),
  CHECK (id_solicitante IN (id_usuario_a, id_usuario_b)),
  CHECK (
    bloqueado_por IS NULL
    OR bloqueado_por IN (id_usuario_a, id_usuario_b)
  )
);

CREATE TABLE IF NOT EXISTS mensajes (
  id_mensaje BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  id_amistad BIGINT UNSIGNED NOT NULL,
  id_emisor BIGINT UNSIGNED NOT NULL,
  id_cliente VARCHAR(80) NOT NULL UNIQUE,
  texto TEXT NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  leido_en DATETIME,
  FOREIGN KEY (id_amistad) REFERENCES amistades (id_amistad),
  FOREIGN KEY (id_emisor) REFERENCES usuarios (id_usuario),
  INDEX (id_amistad, id_mensaje)
);

CREATE TABLE IF NOT EXISTS proyectos (
  id_proyecto BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_seccion BIGINT UNSIGNED NOT NULL,
  titulo VARCHAR(100) NOT NULL,
  descripcion TEXT NOT NULL,
  archivos_borrador JSON NOT NULL,
  archivos_entregados JSON,
  version INT NOT NULL DEFAULT 1,
  version_entregada INT,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
  estado_compilacion VARCHAR(20),
  diagnostico_compilacion TEXT,
  validado_en DATETIME,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  FOREIGN KEY (id_seccion) REFERENCES secciones (id_seccion),
  UNIQUE (id_usuario, id_seccion)
);
