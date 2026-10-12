const fs = require('fs');

function replaceFile(path, replacer) {
  if (fs.existsSync(path)) {
    const content = fs.readFileSync(path, 'utf8');
    const newContent = replacer(content);
    if (content !== newContent) {
      fs.writeFileSync(path, newContent, 'utf8');
      console.log('Fixed', path);
    }
  }
}

replaceFile('angular/src/app/inventory/inventory.component.ts', c => 
  c.replace(/ing\.unitName/g, 'ing.purchaseUnitName')
   .replace(/ing\.ingredientCategoryName/g, 'ing.categoryName')
);

replaceFile('angular/src/app/recipe/recipe.component.ts', c => 
  c.replace(/ing\.unitName/g, 'ing.purchaseUnitName')
   .replace(/ing\.ingredientCategoryName/g, 'ing.categoryName')
);

replaceFile('angular/src/app/dish/dish.component.html', c => 
  c.replace(/ing\.unitName/g, 'ing.purchaseUnitName')
);

replaceFile('angular/src/app/dish/dish.component.ts', c => 
  c.replace(/ing\?\.unitName/g, 'ing?.purchaseUnitName')
   .replace(/ing\.unitName/g, 'ing.purchaseUnitName')
   .replace(/res\.url/g, '(res as any).url')
);

replaceFile('angular/src/app/table/table.component.html', c => 
  c.replace(/t\.capacity >= 4/g, '(t.capacity || 0) >= 4')
   .replace(/t\.capacity >= 8/g, '(t.capacity || 0) >= 8')
);

replaceFile('angular/src/app/dining-area/dining-area.component.html', c => 
  c.replace(/area\.name/g, '(area.name || \'\')')
);

replaceFile('angular/src/app/dining-area/dining-area.component.ts', c => 
  c.replace(/area\.tableCount > 0/g, '(area.tableCount || 0) > 0')
);

replaceFile('angular/src/app/proxy/microsoft/asp-net-core/http/models.ts', c => 
  c.replace(/Record<string, StringValues>/g, 'Record<string, any>')
);
