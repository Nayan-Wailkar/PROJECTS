class Dictionary {
    static async getDefinition(word) {
      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const firstEntry = data[0];
          if (firstEntry.meanings && firstEntry.meanings.length > 0) {
            return firstEntry.meanings[0].definitions[0].definition;
          }
        }
        return `Definition not found for ${word}`;
      } catch (error) {
        console.error('Error fetching definition:', error);
        return `Definition not available for ${word}`;
      }
    }
  }