/**
 * @license
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Helper functions for generating Java for blocks.
 * @author toebes@extremenetworks.com (John Toebes)
 * Loosely based on Python version by fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Java');

goog.require('Blockly.Generator');


/**
 * Java code generator.
 * @type !Blockly.Generator
 */
Blockly.Java = new Blockly.Generator('Java');

/**
 * List of illegal variable names.
 * This is not intended to be a security feature.  Blockly is 100% client-side,
 * so bypassing this list is trivial.  This is intended to prevent users from
 * accidentally clobbering a built-in object or function.
 * @private
 */
Blockly.Java.addReservedWords(
    // import keyword
    // print ','.join(keyword.kwlist)
    // http://en.wikipedia.org/wiki/List_of_Java_keywords
    'abstract,assert,boolean,break,case,catch,class,const,continue,default,do,double,else,enum,extends,final,finally,float,for,goto,if,implements,import,instanceof,int,interface,long,native,new,package,private,protected,public,return,short,static,strictfp,super,switch,synchronized,this,throw,throws,transient,try,void,volatile,while,' +
    //http://en.wikipedia.org/wiki/List_of_Java_keywords#Reserved_words_for_literal_values
    'false,null,true,' +
    // http://docs.Java.org/library/functions.html
    'abs,divmod,input,open,staticmethod,all,enumerate,int,ord,str,any,eval,isinstance,pow,sum,basestring,execfile,issubclass,print,super,bin,file,iter,property,tuple,bool,filter,len,range,type,bytearray,float,list,raw_input,unichr,callable,format,locals,reduce,unicode,chr,frozenset,long,reload,vars,classmethod,getattr,map,repr,xrange,cmp,globals,max,reversed,zip,compile,hasattr,memoryview,round,__import__,complex,hash,min,set,apply,delattr,help,next,setattr,buffer,dict,hex,object,slice,coerce,dir,id,oct,sorted,intern,equal');

/**
 * Order of operation ENUMs.
 * https://docs.oracle.com/javase/tutorial/java/nutsandbolts/operators.html
 */
Blockly.Java.ORDER_ATOMIC = 0;            // 0 "" ...
Blockly.Java.ORDER_COLLECTION = 1;        // tuples, lists, dictionaries
Blockly.Java.ORDER_STRING_CONVERSION = 1; // `expression...`

Blockly.Java.ORDER_MEMBER = 2;            // . []
Blockly.Java.ORDER_FUNCTION_CALL = 2;     // ()

Blockly.Java.ORDER_POSTFIX = 3;           // expr++ expr--
Blockly.Java.ORDER_EXPONENTIATION = 3;    // **  TODO: Replace this

Blockly.Java.ORDER_LOGICAL_NOT = 3;       // not
Blockly.Java.ORDER_UNARY_SIGN = 4;        // ++expr --expr +expr -expr ~ !
Blockly.Java.ORDER_MULTIPLICATIVE = 5;    // * / %
Blockly.Java.ORDER_ADDITIVE = 6;          // + -
Blockly.Java.ORDER_BITWISE_SHIFT = 7;     // << >> >>>
Blockly.Java.ORDER_RELATIONAL = 8;        // < > <= >= instanceof
Blockly.Java.ORDER_EQUALITY = 9;          // == !=
Blockly.Java.ORDER_BITWISE_AND = 10;      // &
Blockly.Java.ORDER_BITWISE_XOR = 11;      // ^
Blockly.Java.ORDER_BITWISE_OR = 12;       // |
Blockly.Java.ORDER_LOGICAL_AND = 13;      // &&
Blockly.Java.ORDER_LOGICAL_OR = 14;       // ||
Blockly.Java.ORDER_CONDITIONAL = 15;      // ? :

Blockly.Java.ORDER_ASSIGNMENT = 16;  // = += -= *= /= %= &= ^= |= <<= >>= >>>=

Blockly.Java.ORDER_NONE = 99;             // (...)

/**
 * Empty loops or conditionals are not allowed in Java.
 */
Blockly.Java.PASS = '\n';

/**
 * Closure code for a section
 */
Blockly.Java.POSTFIX = '';
/**
 * The method of indenting.  Java prefers four spaces by convention
 */
Blockly.Java.INDENT = '    ';
/**
 * Any extra indent to be added to the currently generating code block
 */
Blockly.Java.EXTRAINDENT = '';
/**
 * List of all known Java variable types.
 *  NOTE: Only valid after a call to workspaceToCode
 */
Blockly.Java.variableTypes_ = {};
/**
 * List of all known Blockly variable types. 
 *  NOTE: Only valid after a call to workspaceToCode
 */
Blockly.Java.blocklyTypes_ = {}
/**
 * Default Name of the application for use by all generated classes
 */
Blockly.Java.AppName_ = '';
/**
 * Default Name of the application for use by all generated classes
 */
Blockly.Java.Package_ = '';
/**
 * Base class (if any) for the generated Java code
 */
Blockly.Java.Baseclass_ = '';
/**
 * List of libraries used globally by the generated java code. These are
 * Processed by Blockly.Java.addImport
 */
Blockly.Java.needImports_ = [];
/**
 * List of libraries used by the caller's generated java code.  These will
 * be processed by Blockly.Java.addImport
 */
Blockly.Java.ExtraImports_ = null;
/**
 * Specifies that we want to have the Var Class inline instead of external
 */
Blockly.Java.INLINEVARCLASS = true;
/**
 * List of additional classes used globally by the generated java code.
 */
Blockly.Java.classes_ = [];
/**
 * List of global variables to be generated.
 */
Blockly.Java.globals_ = {};

/**
 * Set the application name for generated classes
 * @param {string} name Name for the application for any generated code
 */
Blockly.Java.setAppName = function(name) {
  this.AppName_ = name;
}

/**
 * Get the application name for generated classes
 * @return {string} name Name for the application for any generated code
 */
Blockly.Java.getAppName = function() {
  return Blockly.Java.variableDB_.getName(this.AppName_,'CLASS');
}

/**
 * Set the package for this generated Java code
 * @param {string} package Name of the package this is derived from
 */
Blockly.Java.setPackage = function(javaPackage) {
  this.Package_ = javaPackage;
}

/**
 * Get the package for this generated Java code
 * @return {string} package Name of the package this is derived from
 */
Blockly.Java.getPackage = function() {
  return this.Package_;
}

/**
 * Set the base class (if any) for the generated Java code
 * @param {string} baseclass Name of a base class this workspace is derived from
 */
Blockly.Java.setBaseclass = function(baseclass) {
  this.Baseclass_ = baseclass;
}

/**
 * Get the base class (if any) for the generated Java code
 * @return {string} baseclass Name of a base class this workspace is derived from
 */
Blockly.Java.getBaseclass = function() {
  var baseClass = this.Baseclass_;
  if (baseClass != '') {
    baseClass = Blockly.Java.variableDB_.getName(baseClass,'CLASS');
  }
  return baseClass;
}

/**
 * Mark a variable as a global for the generated Java code
 * @param {block} block Block that the variable is contained in
 * @param {string} name Name of the global to initialize
 * @param {string} val Initializer value for the gloabl
 */
Blockly.Java.setGlobalVar = function(block,name,val) {
    /*
  if (Blockly.Variables.getLocalContext(block,name) == null &&
      (typeof this.globals_[name] === 'undefined' ||
        this.globals_[name] === null)) {
    this.globals_[name] = val;
  }
    */
};
/**
 * Get the Java type of a variable by name
 * @param {string} variable Name of the variable to get the type for
 * @return {string} type Java type for the variable
 */
Blockly.Java.GetVariableType = function(name) {
  var type = this.variableTypes_[name];
  if (!type) {
//    type = 'String';
    type = 'float';
    Blockly.Java.provideVarClass();
  }
  return type;
};

Blockly.Java.stashStatement = function (statement) {
};

/**
 * Get the Java type of a variable by name
 * @param {string} variable Name of the variable to get the type for
 * @return {string} type Java type for the variable
 */
Blockly.Java.GetBlocklyType = function(variable) {
  return this.blocklyTypes_[variable];
};

/**
 * Add a reference to a library to import
 * @param {string} importlib Name of the library to add to the import list
 */
Blockly.Java.addImport = function(importlib) {
  var importStr = 'import ' + importlib + ';';
  this.imports_[importStr] = importStr;
};

/**
 * Get the list of all libraries to import
 * @param {!Array<string>} imports Array of libraries to add to the list
 * @return {string} code Java code for importing all libraries referenced
 */
Blockly.Java.getImports = function() {
  // Add any of the imports that the top level code needs
  if (this.ExtraImports_) {
    for(var i = 0; i < this.ExtraImports_.length; i++) {
      this.addImport(this.ExtraImports_[i]);
    }
  }

  var keys = goog.object.getValues(this.imports_);
  goog.array.sort(keys);
  return (keys.join("\n"));
};

/**
 * Set the base class (if any) for the generated Java code
 * @param {string} baseclass Name of a base class this workspace is derived from
 */
Blockly.Java.setExtraImports = function(extraImports) {
  this.ExtraImports_ = extraImports;
}
/**
 * Specify whether to inline the Var class or reference it externally
 * @param {string} inlineclass Generate the Var class inline
 */
Blockly.Java.setVarClassInline = function(inlineclass) {
  this.INLINEVARCLASS = inlineclass;
}


Blockly.Java.getClasses = function() {
  var code = '';
  for (var name in this.classes_) {
    code += this.classes_[name];
  }
  if (code) {
    code += '\n\n';
  }
  return code;
}

Blockly.Java.setExtraClass = function(name, code) {
  this.classes_[name] = code.join('\n')+'\n';
}

/*
 * Save away the base class implementation so we can call it but override it
 * so that we get to modify the generated code.
 */
Blockly.Java.workspaceToCode_ = Blockly.Java.workspaceToCode;
/**
 * Generate code for all blocks in the workspace to the specified language.
 * @param {Blockly.Workspace} workspace Workspace to generate code from.
 * @param {string} parms Any extra parameters to pass to the lower level block
 * @return {string} Generated code.
 */
Blockly.Java.workspaceToCode = function(workspace, parms) {
  // Generate the code first to get all of the required imports calculated.
  var code = this.workspaceToCode_(workspace,parms);
  var finalcode = this.getImports() + '\n\n';
  var baseClass = this.getBaseclass();
  finalcode += code + '\n';
  finalcode += this.getClasses();
  return finalcode;
}

Blockly.Java.getValueType = function(block, field) {
  var targetBlock = block.getInputTargetBlock(field);
  if (!targetBlock) {
    return '';
  }

  return targetBlock.outputConnection.check_;
}

Blockly.Java.provideVarClass = function() {
}

/**
 * Initialise the database of variable names.
 * @param {!Blockly.Workspace} workspace Workspace to generate code from.
 */
Blockly.Java.init = function(workspace, imports) {
  // Create a dictionary of definitions to be printed before the code.
  this.definitions_ = Object.create(null);
  // Create a dictionary mapping desired function names in definitions_
  // to actual function names (to avoid collisions with user functions).
  this.functionNames_ = Object.create(null);
  // Create a dictionary of all the libraries which would be needed
  this.imports_ = Object.create(null);
  // Dictionary of any extra classes to output
  this.classes_ = Object.create(null);
  // Dictionary of all the globals
  this.globals_ = Object.create(null);
  // Start with the defaults that all the code depends on
  for(var i = 0; i < this.needImports_.length; i++) {
    this.addImport(this.needImports_[i]);
  }
  if (!this.variableDB_) {
    this.variableDB_ =
        new Blockly.Names(this.RESERVED_WORDS_);
  } else {
    this.variableDB_.reset();
  }

  var defvars = [];
  var variables = Blockly.Variables.allVariables(workspace);
  this.blocklyTypes_ = []; // Blockly.Variables.allVariablesTypes(workspace);
  // Make sure all the type variables are pushed.  This is because we
  // Don't return the special function parameters in the allVariables list
  for(var name in this.blocklyTypes_) {
      variables.push(name);
  }
  var needVarClass = false;
  for (var x = 0; x < variables.length; x++) {
    var key = variables[x];
    var type = this.blocklyTypes_[key];
    if (type === 'Object') {
      type = 'Object';
    } else if (type === 'Array') {
      type = 'LinkedList';
    } else if (type === 'Map') {
      type = 'HashMap';
    } else if (type === 'Var') {
      type = 'Var';
      needVarClass = true;
    } else if (type === 'Boolean') {
      type = 'Boolean';
    } else if (type === 'String') {
      type = 'String';
    } else if (type === 'Colour') {
      type = 'String';
    } else if (type === 'Number') {
      type = 'double';
    } else if (typeof type !== 'undefined' && type !== '') {
      if (Blockly.Blocks[type] && Blockly.Blocks[type].GBPClass ) {
        type = Blockly.Blocks[type].GBPClass;
      } else {
        console.log('Unknown type for '+key+' using Var for '+type);
        type = 'Var';
        needVarClass = true;
      }
    } else {
      // Unknown type
      console.log('Unknown type for '+key+' using Object');
      type = 'Object';
    }
    this.variableTypes_[key] = type;
  }
  if (needVarClass) {
    Blockly.Java.provideVarClass();
  }
};

/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
Blockly.Java.finish = function(code) {
  // Convert the definitions dictionary into a list.
  var definitions = {};
  var funcs = [[],[]];
  for (var name in this.definitions_) {
    if (name === 'variables') {
      continue;
    }
    var def = this.definitions_[name];
    var slot = 1;
    // If the call back for the definition is a function we will asssume that
    // it is not static
    if (typeof def !== "function") {
      // Since we have the text for the function, let's figure out if it is
      // static and sort it first.  Just look at the first two words of the
      // function and if it has 'static' we are good
      var head = def.split(" ",3);
      if (goog.array.contains(head, 'static')) {
        slot = 0;
      }
    }
    funcs[slot].push(name);
  }

  // We have all the functions broken into two slots.  So go through in order
  // and get the statics and then the non-statics to output.
  var allDefs = '';

  for(var def in this.globals_) {
    var initializer = '';
    var type = this.GetVariableType(def);
    if (this.globals_[def] != null && this.globals_[def] !== '') {
      initializer = ' = ' + this.globals_[def];
    } else if (type === 'Var') {
      initializer = ' = new Var(0)';
    } else if (type === 'Boolean') {
      initializer = ' = false';
    } else if (type === 'String') {
      initializer = ' = ""';
    }
    var varname = Blockly.Java.variableDB_.getName(def,
        Blockly.Variables.NAME_TYPE);
    allDefs += 'protected ' + type + ' ' + varname + initializer + ';\n';
  }

  for(var slot = 0; slot < 2; slot++) {
    var names = funcs[slot].sort();
    for (var pos = 0; pos < names.length; pos++) {
      var def = this.definitions_[names[pos]];
      if (typeof def === "function") {
        def = def.call(this);
      }

      // Figure out the header to put on the function
      var header = '';
      if (false) {
      var res1 = def.split("(", 2);
      if (res1.length >= 2) {
        // Figure out the header to put on the function
        var header = '/**\n' +
                     ' * Description goes here\n';
        var extra =  ' *\n';
        var res = res1[0];  // Get everything before the (
        var res2 = res.split(" ");
        var rettype = res2[res2.length-2]; // The next to the last word
        res = res1[1];  // Take the parameters after the (
        res2 = res.split(")",1);
        res = res2[0].trim();
        if (res !== '') {
          var args = res.split(",");
          for (var arg = 0; arg < args.length; arg++) {
            var argline = args[arg].split(" ");
            header += extra + ' * @param ' + argline[argline.length-1] + '\n';
            extra = '';
          }
        }
        if (rettype !== 'void') {
          header += extra + ' * @return ' + rettype + '\n';
          extra = '';
        }
        header += ' */\n';
      }
      }
      allDefs += header + def + '\n\n';
    }
  }
  // Clean up temporary data.
  delete Blockly.Java.definitions_;
  delete Blockly.Java.functionNames_;
  Blockly.Java.variableDB_.reset();
  return allDefs.replace(/\n\n+/g, '\n\n').replace(/\n*$/, '\n\n\n') + code;
};

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
Blockly.Java.scrubNakedValue = function(line) {
  return line + ';\n';
};

/**
 * Encode a string as a properly escaped Java string, complete with quotes.
 * @param {string} string Text to encode.
 * @return {string} Java string.
 * @private
 */
Blockly.Java.quote_ = function(string) {
  return goog.string.quote(string);
};

/**
 * Generate code to treat an item as a string.  If it is numeric, quote it
 * if it is a string already, do nothing.  Otherwise use the blocklyToString
 * function at runtime.
 * @param {!Blockly.Block} block The block containing the input.
 * @param {string} name The name of the input.
 * @return {string} Generated Java code or '' if no blocks are connected or the
 *     specified input does not exist.
 */


Blockly.Java.toStringCode = function(block,name) {
  var targetBlock = block.getInputTargetBlock(name);
  if (!targetBlock) {
    return '';
  }
  var item = Blockly.Java.valueToCode(block,name,Blockly.Java.ORDER_NONE);
  item = item.trim();

  // Empty strings and quoted strings are perfectly fine as they are
  if (item !== '' && item.charAt(0) !== '"') {
    if ((targetBlock.type === 'variables_get') &&
      (Blockly.Java.GetVariableType(targetBlock.procedurePrefix_+
      targetBlock.getFieldValue('VAR')) === 'Var')) {
      item += '.toString()';
    } else if (Blockly.isNumber(item)) {
      // Pure numbers get quoted
      item = '"' + item + '"';
    } else if(targetBlock.type !== 'variables_get' &&
      Blockly.Java.GetVariableType(item) === 'Var') {
      item = item + '.toString()';
    } else {
      // It is something else so we need to convert it on the fly
      this.addImport('java.text.DecimalFormat');
      this.addImport('java.text.NumberFormat');

      var functionName = this.provideFunction_(
          'blocklyToString',
         [ 'public static String blocklyToString(Object object) {',
           '    String result;',
           '    if (object instanceof String) {',
           '        result = (String) object;',
           '    } else {',
           '        // must be a number',
           '        // might be a double',
           '        try {',
           '            Double d = (double) object;',
           '            // it was a double, so keep going',
           '            NumberFormat formatter = new DecimalFormat("#.#####");',
           '            result = formatter.format(d);',
           '',
           '        } catch (Exception ex) {',
           '            // not a double, see if it is an integer',
           '            try {',
           '                Integer i = (int) object;',
           '                // format should be number with a decimal point',
           '                result = i.toString();',
           '            } catch (Exception ex2) {',
           '                // not a double or integer',
           '                result = "UNKNOWN";',
           '            }',
           '        }',
           '    }',
           '',
           '  return result;',
           '}'
          ]);
      item = functionName + '(' + item + ')';
    }
  }
  return item;
};

/**
 * Common tasks for generating Java from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The Java code created for this block.
 * @return {string} Java code with comments and subsequent blocks added.
 * @private
 */
Blockly.Java.scrub_ = function(block, code, parms) {
  var commentCode = '';
  // Only collect comments for blocks that aren't inline.
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    // Collect comment for this block.
    var comment = block.getCommentText();
    if (comment) {
      commentCode += this.prefixLines(comment, '// ') + '\n';
    }
    // Collect comments for all value arguments.
    // Don't collect comments for nested statements.
    for (var x = 0; x < block.inputList.length; x++) {
      if (block.inputList[x].type == Blockly.INPUT_VALUE) {
        var childBlock = block.inputList[x].connection.targetBlock();
        if (childBlock) {
          var comment = this.allNestedComments(childBlock);
          if (comment) {
            commentCode += this.prefixLines(comment, '// ');
          }
        }
      }
    }
  }
  var postFix = this.POSTFIX;
  this.POSTFIX = '';
  var extraIndent = this.EXTRAINDENT;
  this.EXTRAINDENT = '';
  var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  var nextCode = this.blockToCode(nextBlock, parms);
  if (extraIndent != '') {
    nextCode = this.prefixLines(nextCode, extraIndent);
  }
  return commentCode + code + nextCode + postFix;
};
