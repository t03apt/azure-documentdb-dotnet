function Next(partitionKey, sequenceName, count) {
    if (!partitionKey) {
        throw new Error(`partitionKey is invalid. Value:${partitionKey}`);
    }

    if (!sequenceName) {
        throw new Error(`sequenceName is invalid. Value:${sequenceName}`);
    }

    if (!count) {
        throw new Error(`count is invalid. Value:${count}`);
    }

    if (!Number.isInteger(count)) {
        throw new Error(`count needs to be an integer. Value:${count}`);
    }

    const context = getContext();
    const $ = context.getCollection();
    const documentType = 'Sequence';

    const createNewSequence = function () {
        return {
            documentType: documentType,
            name: sequenceName,
            partitionKey: partitionKey,
            startValue: 0,
            currentValue: 0,
            creationDate: new Date(),
            modificationDate: new Date()
        }
    }

    const saveCallback = function (element) {
        return function (error, resource, responseHeaders) {
            if (error) {
                throw new Error(JSON.stringify(error));
            }

            context.getResponse().setBody(element);
        }
    }

    const save = function (element) {
        $.upsertDocument(
            $.getSelfLink(),
            element,
            { 
                etag: element._etag 
            },
            saveCallback(element));
    }

    const increment = function (error, documents, responseOptions) {
        var element = null;
        if (error) {
            throw new Error('Increment error ' + error.message);
        }

        if (!documents || !documents.length) {
            element = createNewSequence();
        } else {
            element = documents[0];
        }

        element.currentValue += count;
        element.modificationDate = new Date();
        save(element);
    }

    const query = $.queryDocuments(
        $.getSelfLink(),
        `SELECT * FROM sequences s 
WHERE s.partitionKey = '${partitionKey}'
AND s.documentType = '${documentType}'
AND s.name = '${sequenceName}'`,
        {},
        increment);

    if (!query) {
        return;
    }
} 