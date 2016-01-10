
(function(
    document,
    CustomEvent,
    $,
    Immutable,
    PouchDB,
    FileReader,
    XLSX,
    undefined) {

  function store_workbook(db, workbook, callback, err_callback) {

    items = [];
    workbook.SheetNames.forEach(function(sheetName) {
      if (['LAGeSo Liste', 'Tabelle1'].indexOf(sheetName) === -1) {
        sheet = workbook.Sheets[sheetName];
        XLSX.utils.sheet_to_json(sheet).forEach(function(item) {
          items.push($.extend({}, item, {
            '_id': sheetName + ':' + item.__rowNum__,
            'sheet': sheetName
          }));
        });
      }
    });

    db.bulkDocs(items)
      .then(function (result) {
        callback();
      }).catch(function (err) {
        console.log(err);
        err_callback();
      });
  }

  function route(id) {
    document.dispatchEvent(
      new CustomEvent('route', { detail: id }));
  }

  // Database
  var Database = function(name) {
    this.name = name || "EJF";
    this.init();
  };
  Database.prototype = {
    init: function() {
      this.pouchdb = PouchDB(this.name);
    },
    empty: function(callback, err_callback) {
      var self = this;
      this.pouchdb.destroy()
        .then(function() {
          self.init();
          callback();
        })
        .catch(function(err) {
          console.log(err);
          err_callback()
        });
    }
  };
  
  // Navigation
  var Navigation = function($el, db) {
    this.$el = $el;
    this.db = db;
    this.init();
  };
  Navigation.prototype = {
    init: function() {
      this.items = this.getItems();
      this.render();
    },
    getItems: function() {
      var items = [];
      $('li', this.$el).each(function() {
        $item = $('a', this);
        items.push(Immutable.Map({
          id: $item.attr('id').slice(6),
          title: $item.text()
        }));
      })
      return Immutable.List(items);
    },
    getActive: function() {
      var hash = window.location.hash;
      if (hash) {
        return hash.slice(7); 
      }
      $el = $('li.active a', this.$el);
      if ($el.size() === 1) {
        return $el.attr('id').slice(6);
      }
      return 'database'
    },
    render: function() {
      var self = this;
      var active = this.getActive()

      this.$el.html('');
      this.items.forEach(function(item) {
        var $item = $('<li/>');
        var $link = $('<a/>')
          .attr('href', '#route-' + item.get('id'))
          .attr('id', item.get('id'))
          .html(item.get('title'))
          .on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            route(item.get('id'));

          });

        if (active === item.get('id')) {
          $item.addClass('active');
        }

        self.$el.append($item.append($link));
      });
    }
  };

  var RentCheckFields = [
    { name: 'registration-number',
      label: 'Aktenzeichen',
      help: 'z.B. A2044-010101',
      type: 'text'
      },
    { name: 'client-gender',
      label: 'Geschlecht',
      type: 'choice',
      options: [
          { value: 'male', label: 'Mann' },
          { value: 'female', label: 'Frau' }
        ]
      },
    { name: 'client-firstname',
      label: 'Vorname',
      type: 'text',
      help: 'z.B. Belal'
      },
    { name: 'client-lastname',
      label: 'Nachname',
      type: 'text',
      help: 'z.B. Isreb'
      },
    { name: 'client-birthdate',
      label: 'Geburtsdatum',
      type: 'text',
      help: 'z.B. 01.01.1999'
      },
    { name: 'client-address-street',
      label: 'Derzeitige Anschrift',
      type: 'text',
      help: 'z.B. Turmstr. 21'
      },
    { name: 'client-address-zip',
      label: 'PLZ',
      type: 'text',
      help: 'z.B. 10559'
      },
    { name: 'client-family-member1',
      label: 'Familienangehörige 1',
      type: 'text',
      help: 'z.B. Isreb, Fatima',
      },
    { name: 'client-family-member2',
      label: 'Familienangehörige 2',
      type: 'text'
      },
    { name: 'client-family-member3',
      label: 'Familienangehörige 3',
      type: 'text'
      },
    { name: 'client-family-member4',
      label: 'Familienangehörige 4',
      type: 'text'
      },
    { name: 'client-family-member 5',
      label: 'Familienangehörige',
      type: 'text'
      },
    { name: 'client-family-member6',
      label: 'Familienangehörige 6',
      type: 'text'
      },
    { name: 'appartment-street',
      label: 'Addresse Wohnungs housenummer',
      type: 'text'
      },
    { name: 'appartment-zip',
      label: 'Postzahl',
      type: 'text'
      },
    { name: 'appartment-building-size',
      label: 'Gebäudefläche',
      type: 'text'
      },
    { name: 'appartment-size',
      label: 'Gebäudefläche',
      type: 'text'
      },
    { name: 'appartment-numbers-of-rooms',
      label: 'Zimmer',
      type: 'text'
      },
    { name: 'appartment-heating-source',
      label: 'Heizungsart',
      type: 'choice',
      options: [
          { value: 1, label: 'Heizöl' },
          { value: 2, label: 'Erdgas' },
          { value: 3, label: 'Fernwärme' }
        ]
      },
    { name: 'appartment-is-heating-decentralized',
      label: 'Wohnung mit dezentraler Warmwasserversorgung?',
      type: 'choice',
      options: [
          { value: true, label: 'Ja' },
          { value: false, label: 'Nein' }
        ]
      },
    { name: 'appartment-heating-costs',
      label: 'Tatsächliche heizkosten',
      type: 'text'
      },
    { name: 'appartment-price-cold-brutto',
      label: 'Bruttokaltmiete',
      type: 'text'
      },
  ]
  // Content
  var Content = function($el, db) {
    this.$el = $el;
    this.db = db;
    this.init.call(this);
  };
  Content.prototype = {
    init: function() {
    },
    render: function(route) {
      var render = this['render_' + route.replace('-', '_')];
      if (render !== undefined) {
        render.call(this);
      }
    },
    render_rent_check: function(status) {
      this.$el.html('');
      var $title = $('<h1>Mietprüfung</h1>');
      var $form = $('<form/>').addClass('form-horizontal');

      RentCheckFields.forEach(function(field) {
        var $field = $('<div/>').addClass('form-group');

        $field.append(
          $('<label/>')
            .addClass('col-sm-2 control-label')
            .attr('for', field.name)
            .text(field.label || ''));

        if (field.type === 'text') {
          $field.append(
            $('<div/>')
              .addClass('col-sm-10')
              .append($('<input />')
                .addClass('form-control')
                .attr('name', field.name)
                .attr('placeholder', field.help || '')
              ));
        }

        $form.append($field);
      })


      this.$el.append($title);
      this.$el.append($form);
    },
    render_database: function(status) {
      this.$el.html('');

      var self = this;
      $title = $('<h1/>').html('Client database');

      $upload_loading = $('<div/>')
        .hide()
        .addClass('upload_loading')
        .append($('<div/>')
          .addClass('progress')
          .append($('<div/>')
              .addClass('progress-bar progress-bar-striped active')
              .css('width', '100%')));

      function handleUpload(e) {
        e.preventDefault();
        e.stopPropagation();

        $upload_loading.show();
        $upload_dropzone.hide();

        var files = [];

        if (e.dataTransfer) {
          files = e.dataTransfer.files;
        } else {
          files = e.target.files;
        }

        var i, file;
        for (i = 0, file = files[i]; i != files.length; ++i) {
          var reader = new FileReader();
          reader.onload = function(e) {
            var data = e.target.result;
            var workbook = XLSX.read(data, {type: 'binary'});
            self.db.empty(
              function() {
                store_workbook(self.db.pouchdb, workbook,
                  function() {
                    self.render_database({ type: 'success', message: 'Sucessfully imported into database.' });
                  },
                  function() {
                    self.render_database({ type: 'danger', message: 'Something went wrong.' });
                  });
              },
              function() {
                self.render_database({ type: 'danger', message: 'Something went wrong.' });
              });
          };
          reader.readAsBinaryString(file);
        }

      };

      $upload_file = $('<input/>')
        .attr('type', 'file')
        .on('change', handleUpload);

      $upload_dropzone = $('<div/>')
        .html('<div>Drag&drop excel file here or click to upload it.</div>')
        .addClass('upload_dropzone')
        .on('drop', handleUpload)
        .on('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          $upload_file.trigger('click');
        });

      $upload = $('<div/>')
        .addClass('upload')
        .append($upload_dropzone)
        .append($upload_loading);


      $table_head = $('<tr/>');
      $table_foot = $('<tr/>');

      columns = [
        "Datum Asylantrag",
        "Name, Vorname Haushaltsvorstand",
        "geboren",
        "Gültigkeit AG",
        "Sprache",
        "Kontakt",
        "Persönliche Daten",
        "WfF",
        "sheet"
        // TODO:
      ];

      columns.forEach(function(column) {
        $table_head.append($('<th/>').html(column))
        $table_foot.append($('<th/>').html(column))
      });

      $table = $('<table/>')
          .addClass('table table-striped table-bordered')
          .attr('cellspacing', '0')
          .attr('width', '100%')
          .append($('<thead>').append($table_head))
          .append($('<tfoot>').append($table_foot));

      this.db.pouchdb
        .allDocs({ include_docs: true, attachments: true })
        .then(function(result) {
          var $table_body  = $('<tbody>');
          result.rows.forEach(function(item) {
            var $table_body_row = $('<tr/>')
            columns.forEach(function(column) {
              item_column = item.doc[column];
              if (item_column === undefined) {
                item_column = '';
              }
              $table_body_row.append($('<td/>').html(item_column));
            });
            $table_body.append($table_body_row);
          });
          $table.append($table_body);
          self.$el.append($table);
          $table.DataTable();
        });

      this.$el.append($title);
      if (status) {
        this.$el.append($('<div/>')
            .addClass('alert alert-' + status.type)
            .append('<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>')
            .append('<span>' + status.message + '</span>'));
      }
      this.$el.append($upload);
    }
  };
  
  
  $(document).ready(function() {

    database = new Database();
    navigation = new Navigation($('#navigation'), database);
    content = new Content($('#content'), database);

    document.addEventListener('route', function(e) {
      var route = e.detail;

      document.location.hash = "#route-" + route;

      navigation.render.call(navigation);
      content.render.apply(content, [route]);

    }, false);

    content.render.apply(content, [navigation.getActive()]);

    window.EJF = {
      database: database,
      navigation: navigation,
      content: content
    };
  });

})(
  window,
  window.CustomEvent,
  window.jQuery,
  window.Immutable,
  window.PouchDB,
  window.FileReader,
  window.XLSX
  );
