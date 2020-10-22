const hotelsModel = require("../models/hotel/hotel.model");
const fetch = require("node-fetch");

class Hotel {
  //this is used to create a hotel
  static async create(hotel) {
    try {
      const result = await hotelsModel.create(hotel);

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async updatePictures(hotel) {
    try {
      let pics = [];
      let hotels = (
        await Hotel.getHotels({
          recordPerPage: 100,
          sort: "updated_at",
          order: 1,
        })
      ).hotels;

      await fetch(
        `https://api.unsplash.com/search/photos/?client_id=ActDAe-BqrYcZiLu8O-tAbM4cH0n51DaptUu3x2wZ4Y&page=1&query=hotel&per_page=40`
      )
        .then((res) => res.json())
        .then((json) => {
          json.results.map((pic) => {
            pics.push(pic.urls.regular);
          });
        })
        .catch((error) => {
          console.log("error:", error);
        });

      for (let i = 0; i < hotels.length; i++) {
        // hotels[i].hotel_image = pics[i];
        let update = await hotelsModel.updateOne(
          { hotel_id: hotels[i].hotel_id },
          { hotel_image: pics[i] }
        );
        console.log("update:", update);
      }

      console.log("hotels:", hotels);
      return hotels;
    } catch (error) {
      throw error;
    }
  }

  //   TODO: UPDATE HOTEL HELPER

  static async getHotels({
    sort,
    order,
    page,
    recordPerPage,
    filter,
    fromDate,
    toDate,
  }) {
    try {
      sort = sort || "updated_at";
      order = order || "desc";
      filter = filter || "";
      page = page || 1;
      recordPerPage = parseInt(recordPerPage) || 10;
      const startIndex = (page - 1) * recordPerPage;

      let matchQuery = {
        deleted: false,
      };

      let query = hotelsModel.aggregate().match(matchQuery).lookup({
        from: "rooms",
        localField: "hotel_id",
        foreignField: "hotel_id",
        as: "rooms",
      });

      // filter
      if (fromDate && toDate) {
        query.match({
          created_at: {
            $lte: new Date(toDate),
            $gte: new Date(fromDate),
          },
        });
      }

      if (filter) {
        query.match({
          $or: [
            {
              hotel_name: {
                $regex: `${filter}`,
                $options: "xi",
              },
            },
            {
              address: {
                $regex: filter,
                $options: "xi",
              },
            },
          ],
        });
      }

      query.project({
        hotel_id: 1,
        hotel_name: 1,
        address: 1,
        stars: 1,
        rooms: 1,
        number_of_rooms: 1,
        hotel_image: 1,
      });

      // sort
      query
        .sort({
          [sort]: order,
          start_date: order,
        })

        .group({
          _id: null,
          total_count: {
            $sum: 1,
          },
          data: {
            $push: "$$ROOT",
          },
        })

        .project({
          total_count: true,
          hotels: {
            $slice: ["$data", startIndex, recordPerPage],
          },
        });

      let result = await query;

      if (!result[0]) {
        return { _id: null, total_count: 0, hotels: [] };
      }

      return result[0];
    } catch (error) {
      throw error;
    }
  }

  static async getHotel(id) {
    let result = await hotelsModel.findOne({
      hotel_id: id,
    });
    if (!result) {
      return null;
    }

    return result;
  }

  static async delete(_id) {
    const hotel = await hotelsModel.delete({ _id });

    return hotel;
  }
}

module.exports = Hotel;
