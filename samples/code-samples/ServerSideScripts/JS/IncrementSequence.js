function Next(partitionKey, sequenceName, increment, minValue, maxValue) {
    const assertHasValue = function (value, name) {
        if (!value) {
            throw new Error(`${name} is invalid. Value:${value}`);
        }
    }

    const assertIsNumber = function (value, name) {
        assertHasValue(value, name);

        if (!Number.isInteger(value)) {
            throw new Error(`${name} needs to be an integer. Value:${value}`);
        }
    }

    assertHasValue(partitionKey, 'partitionKey');
    assertHasValue(sequenceName, 'sequenceName');
    assertIsNumber(increment, 'increment');
    assertIsNumber(minValue, 'minValue');
    assertIsNumber(maxValue, 'maxValue');

    if (minValue >= maxValue) {
        throw new Error(`maxValue needs to be greater than minValue. minValue:${minValue}, maxValue:${maxValue}`);
    }

    if (!(minValue + increment <= maxValue)) {
        throw new Error(`minValue plus increment needs to be less than maxValue. minValue:${minValue}, increment:${increment}, maxValue:${maxValue}`);
    }

    const context = getContext();
    const $ = context.getCollection();
    const documentType = 'Sequence';

    const throwError = function (error) {
        throw new Error(JSON.stringify(error));
    }

    const createNewSequence = function () {
        return {
            documentType: documentType,
            name: sequenceName,
            partitionKey: partitionKey,
            creationDate: new Date(),
            currentValue: minValue
        }
    }

    const saveCallback = function (element) {
        return function (error, resource, responseHeaders) {
            if (error) {
                throwError(error);
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

    const incrementSequence = function (error, documents, responseOptions) {
        if (error) {
            throwError(error);
        }

        const element = (!documents || !documents.length) ? createNewSequence() : documents[0];
        element.modificationDate = new Date();
        element.currentValue += increment;
        if (element.currentValue > maxValue) {
            element.currentValue = minValue + increment;
        }

        save(element);
    }

    const query = $.queryDocuments(
        $.getSelfLink(),
        `SELECT * FROM sequences s 
WHERE s.partitionKey = '${partitionKey}'
AND s.documentType = '${documentType}'
AND s.name = '${sequenceName}'`,
        {},
        incrementSequence);
} 